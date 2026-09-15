create table public.stock_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  movement_id uuid not null references public.movements(id) on delete restrict,
  effect_kind text not null,
  delta_kg numeric(18,3) not null check (delta_kg <> 0),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (movement_id, effect_kind)
);

create index stock_ledger_scope_idx on public.stock_ledger_entries (tenant_id, organization_id, unit_id, material_id, occurred_at);

create table public.stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  snapshot_type text not null check (snapshot_type in ('system_calculated','physical_count')),
  quantity_kg numeric(18,3) not null,
  counted_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid not null,
  previous_state jsonb,
  new_state jsonb,
  technical_context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_scope_time_idx on public.audit_events (tenant_id, organization_id, occurred_at desc);
create index audit_events_subject_idx on public.audit_events (subject_type, subject_id, occurred_at desc);

create view public.current_stock
with (security_invoker = true)
as
select
  tenant_id,
  organization_id,
  unit_id,
  material_id,
  sum(delta_kg)::numeric(18,3) as quantity_kg
from public.stock_ledger_entries
group by tenant_id, organization_id, unit_id, material_id;

create or replace function app_private.current_stock_quantity(
  p_tenant_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_material_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(delta_kg), 0)::numeric
  from public.stock_ledger_entries
  where tenant_id = p_tenant_id
    and organization_id = p_organization_id
    and unit_id is not distinct from p_unit_id
    and material_id = p_material_id;
$$;

create or replace function app_private.prevent_immutable_record_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create trigger stock_ledger_append_only
before update or delete on public.stock_ledger_entries
for each row execute function app_private.prevent_immutable_record_mutation();

create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function app_private.prevent_immutable_record_mutation();

create or replace function app_private.apply_movement_stock_effect()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  delta numeric(18,3);
  available numeric;
  src_org uuid;
  dst_org uuid;
  ledger_row record;
begin
  if old.status = 'draft' and new.status = 'posted' then
    if new.movement_type in ('receipt','inbound','collection') then
      delta := new.quantity_kg;
    elsif new.movement_type in ('outbound','sale','destination','reject') then
      delta := -new.quantity_kg;
    elsif new.movement_type = 'adjustment' then
      delta := new.quantity_kg;
    elsif new.movement_type = 'transfer' then
      if new.source_unit_id is null or new.destination_unit_id is null then
        raise exception 'M0 transfer requires source and destination units';
      end if;

      select organization_id into src_org from public.units where id = new.source_unit_id;
      select organization_id into dst_org from public.units where id = new.destination_unit_id;
      if src_org <> new.organization_id or dst_org <> new.organization_id then
        raise exception 'M0 transfer supports units inside the movement organization';
      end if;

      available := app_private.current_stock_quantity(new.tenant_id,new.organization_id,new.source_unit_id,new.material_id);
      if available - new.quantity_kg < 0 then
        raise exception 'insufficient stock for transfer';
      end if;

      insert into public.stock_ledger_entries (
        tenant_id,organization_id,unit_id,material_id,movement_id,effect_kind,delta_kg,occurred_at
      ) values (
        new.tenant_id,new.organization_id,new.source_unit_id,new.material_id,new.id,'transfer_out',-new.quantity_kg,new.occurred_at
      ) on conflict (movement_id,effect_kind) do nothing;

      insert into public.stock_ledger_entries (
        tenant_id,organization_id,unit_id,material_id,movement_id,effect_kind,delta_kg,occurred_at
      ) values (
        new.tenant_id,new.organization_id,new.destination_unit_id,new.material_id,new.id,'transfer_in',new.quantity_kg,new.occurred_at
      ) on conflict (movement_id,effect_kind) do nothing;

      return new;
    else
      return new;
    end if;

    if delta < 0 then
      available := app_private.current_stock_quantity(new.tenant_id,new.organization_id,new.unit_id,new.material_id);
      if available + delta < 0
         and not (new.movement_type = 'adjustment' and new.evidence_level = 'AUDITED') then
        raise exception 'insufficient stock for movement';
      end if;
    end if;

    insert into public.stock_ledger_entries (
      tenant_id,organization_id,unit_id,material_id,movement_id,effect_kind,delta_kg,occurred_at
    ) values (
      new.tenant_id,new.organization_id,new.unit_id,new.material_id,new.id,'post',delta,new.occurred_at
    ) on conflict (movement_id,effect_kind) do nothing;

  elsif old.status = 'posted' and new.status = 'voided' then
    for ledger_row in
      select * from public.stock_ledger_entries
      where movement_id = new.id and effect_kind not like 'reversal%'
    loop
      insert into public.stock_ledger_entries (
        tenant_id,organization_id,unit_id,material_id,movement_id,effect_kind,delta_kg,occurred_at
      ) values (
        ledger_row.tenant_id,
        ledger_row.organization_id,
        ledger_row.unit_id,
        ledger_row.material_id,
        ledger_row.movement_id,
        case ledger_row.effect_kind
          when 'post' then 'reversal'
          else 'reversal_' || ledger_row.effect_kind
        end,
        -ledger_row.delta_kg,
        now()
      ) on conflict (movement_id,effect_kind) do nothing;
    end loop;
  end if;

  return new;
end;
$$;

create trigger movements_stock_effect
after update of status on public.movements
for each row execute function app_private.apply_movement_stock_effect();

create or replace function app_private.audit_movement_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'movement.created';
    insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,new_state)
    values (new.tenant_id,new.organization_id,new.created_by,event_action,'movement',new.id,to_jsonb(new));
    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'posted' then event_action := 'movement.posted';
    elsif new.status = 'voided' then event_action := 'movement.voided';
    else return new;
    end if;

    insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,previous_state,new_state)
    values (new.tenant_id,new.organization_id,auth.uid(),event_action,'movement',new.id,to_jsonb(old),to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger movements_audit_insert
after insert on public.movements
for each row execute function app_private.audit_movement_change();

create trigger movements_audit_status
after update of status on public.movements
for each row execute function app_private.audit_movement_change();

create or replace function app_private.audit_document_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,new_state)
  values (new.tenant_id,new.organization_id,new.uploaded_by,'document.created','document',new.id,to_jsonb(new));
  return new;
end;
$$;
create trigger documents_audit after insert on public.documents for each row execute function app_private.audit_document_insert();

create or replace function app_private.audit_evidence_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare m public.movements;
begin
  select * into m from public.movements where id=new.movement_id;
  insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,new_state)
  values (m.tenant_id,m.organization_id,new.created_by,'evidence.created','evidence',new.id,to_jsonb(new));
  return new;
end;
$$;
create trigger evidences_audit after insert on public.evidences for each row execute function app_private.audit_evidence_insert();

create or replace function app_private.audit_validation_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare m_id uuid; m public.movements;
begin
  m_id := new.movement_id;
  if m_id is null and new.evidence_id is not null then select movement_id into m_id from public.evidences where id=new.evidence_id; end if;
  if m_id is null and new.document_id is not null then select movement_id into m_id from public.evidences where document_id=new.document_id order by created_at limit 1; end if;
  if m_id is not null then
    select * into m from public.movements where id=m_id;
    insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,new_state)
    values (m.tenant_id,m.organization_id,new.actor_user_id,'validation.created','validation',new.id,to_jsonb(new));
  end if;
  return new;
end;
$$;
create trigger validations_audit after insert on public.validations for each row execute function app_private.audit_validation_insert();

create or replace function app_private.audit_reconciliation_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare m public.movements;
begin
  select * into m from public.movements where id=new.left_movement_id;
  insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,new_state)
  values (m.tenant_id,m.organization_id,new.reviewed_by,'reconciliation.created','reconciliation',new.id,to_jsonb(new));
  return new;
end;
$$;
create trigger reconciliations_audit after insert on public.reconciliations for each row execute function app_private.audit_reconciliation_insert();

create or replace function app_private.audit_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_events (tenant_id,organization_id,actor_user_id,action,subject_type,subject_id,previous_state,new_state)
  values (
    new.tenant_id,new.organization_id,auth.uid(),'membership.changed','membership',new.id,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;
create trigger memberships_audit_insert after insert on public.memberships for each row execute function app_private.audit_membership_change();
create trigger memberships_audit_update after update on public.memberships for each row execute function app_private.audit_membership_change();

alter table public.stock_ledger_entries enable row level security;
alter table public.stock_snapshots enable row level security;
alter table public.audit_events enable row level security;

create policy stock_ledger_select on public.stock_ledger_entries
for select to authenticated
using (app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'stock.read'));

create policy stock_snapshots_select on public.stock_snapshots
for select to authenticated
using (app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'stock.read'));

create policy audit_events_select on public.audit_events
for select to authenticated
using (
  organization_id is not null
  and app_private.has_permission(auth.uid(),tenant_id,organization_id,null,'audit.read')
);
