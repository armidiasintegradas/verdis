create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  provider text not null,
  model_name text not null,
  model_version text,
  extracted_fields jsonb not null default '{}'::jsonb,
  raw_result jsonb,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now()
);

create index document_extractions_document_time_idx on public.document_extractions (document_id, created_at desc);

create table public.evidences (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.movements(id) on delete cascade,
  document_id uuid references public.documents(id) on delete restrict,
  evidence_type text not null,
  claimed_fields jsonb not null default '{}'::jsonb,
  extracted_fields jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status public.review_status not null default 'pending',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index evidences_movement_idx on public.evidences (movement_id, created_at desc);
create index evidences_document_idx on public.evidences (document_id) where document_id is not null;

create table public.validations (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  evidence_id uuid references public.evidences(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  validation_type text not null,
  status public.review_status not null,
  automated boolean not null default false,
  actor_user_id uuid references auth.users(id) on delete restrict,
  rule_code text not null,
  reason text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(movement_id, evidence_id, document_id) >= 1),
  check (validation_type <> 'human_audit' or (automated = false and actor_user_id is not null))
);

create index validations_movement_idx on public.validations (movement_id, created_at desc) where movement_id is not null;
create index validations_evidence_idx on public.validations (evidence_id, created_at desc) where evidence_id is not null;
create index validations_document_idx on public.validations (document_id, created_at desc) where document_id is not null;

create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  left_movement_id uuid not null references public.movements(id) on delete restrict,
  right_movement_id uuid not null references public.movements(id) on delete restrict,
  status public.review_status not null default 'pending',
  quantity_difference_kg numeric(18,3) not null,
  match_score numeric(5,4) check (match_score is null or (match_score >= 0 and match_score <= 1)),
  reviewed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (left_movement_id <> right_movement_id)
);

create unique index reconciliations_pair_idx on public.reconciliations (
  least(left_movement_id, right_movement_id),
  greatest(left_movement_id, right_movement_id)
);

create or replace function app_private.prevent_extraction_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'document extraction history is append-only';
end;
$$;

create trigger document_extractions_append_only
before update or delete on public.document_extractions
for each row execute function app_private.prevent_extraction_mutation();

create or replace function app_private.ensure_evidence_scope_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  movement_tenant uuid;
  movement_org uuid;
  document_tenant uuid;
  document_org uuid;
begin
  if new.document_id is null then
    return new;
  end if;

  select tenant_id, organization_id into movement_tenant, movement_org
  from public.movements where id = new.movement_id;
  select tenant_id, organization_id into document_tenant, document_org
  from public.documents where id = new.document_id;

  if document_tenant is null
     or document_tenant <> movement_tenant
     or document_org <> movement_org then
    raise exception 'evidence document must belong to movement scope';
  end if;
  return new;
end;
$$;

create trigger evidences_scope_consistency
before insert or update of movement_id, document_id on public.evidences
for each row execute function app_private.ensure_evidence_scope_consistency();

create or replace function app_private.ensure_reconciliation_scope_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  left_tenant uuid;
  right_tenant uuid;
begin
  select tenant_id into left_tenant from public.movements where id = new.left_movement_id;
  select tenant_id into right_tenant from public.movements where id = new.right_movement_id;
  if left_tenant is null or right_tenant is null or left_tenant <> right_tenant then
    raise exception 'reconciliation movements must belong to the same tenant';
  end if;
  return new;
end;
$$;

create trigger reconciliations_scope_consistency
before insert or update of left_movement_id, right_movement_id on public.reconciliations
for each row execute function app_private.ensure_reconciliation_scope_consistency();

create or replace function app_private.recalculate_movement_evidence_level(p_movement_id uuid)
returns public.evidence_level
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  derived_level public.evidence_level;
begin
  if exists (
    select 1
    from public.validations v
    left join public.evidences ev on ev.id = v.evidence_id
    where v.status = 'accepted'
      and v.validation_type = 'human_audit'
      and v.automated = false
      and v.actor_user_id is not null
      and (
        v.movement_id = p_movement_id
        or ev.movement_id = p_movement_id
        or exists (
          select 1 from public.evidences de
          where de.document_id = v.document_id and de.movement_id = p_movement_id
        )
      )
  ) then
    derived_level := 'AUDITED';
  elsif exists (
    select 1
    from public.validations v
    left join public.evidences ev on ev.id = v.evidence_id
    where v.status = 'accepted'
      and v.validation_type = 'traceability'
      and (
        v.movement_id = p_movement_id
        or ev.movement_id = p_movement_id
        or exists (
          select 1 from public.evidences de
          where de.document_id = v.document_id and de.movement_id = p_movement_id
        )
      )
  ) then
    derived_level := 'TRACEABILITY_PROVEN';
  elsif exists (
    select 1 from public.reconciliations r
    where r.status = 'accepted'
      and (r.left_movement_id = p_movement_id or r.right_movement_id = p_movement_id)
  ) then
    derived_level := 'RECONCILED';
  elsif exists (
    select 1
    from public.validations v
    left join public.evidences ev on ev.id = v.evidence_id
    where v.status = 'accepted'
      and (
        v.movement_id = p_movement_id
        or ev.movement_id = p_movement_id
        or exists (
          select 1 from public.evidences de
          where de.document_id = v.document_id and de.movement_id = p_movement_id
        )
      )
  ) then
    derived_level := 'VALIDATED';
  elsif exists (
    select 1
    from public.evidences e
    join public.document_extractions x on x.document_id = e.document_id
    where e.movement_id = p_movement_id
  ) then
    derived_level := 'DOCUMENT_VERIFIED';
  elsif exists (
    select 1 from public.evidences e where e.movement_id = p_movement_id
  ) then
    derived_level := 'EVIDENCED';
  else
    derived_level := 'AUTODECLARED';
  end if;

  update public.movements
  set evidence_level = derived_level
  where id = p_movement_id
    and evidence_level is distinct from derived_level;

  return derived_level;
end;
$$;

revoke execute on function app_private.recalculate_movement_evidence_level(uuid) from public, anon, authenticated;

create or replace function app_private.recalculate_from_evidence_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform app_private.recalculate_movement_evidence_level(coalesce(new.movement_id, old.movement_id));
  return coalesce(new, old);
end;
$$;

create trigger evidences_recalculate_level
after insert or update or delete on public.evidences
for each row execute function app_private.recalculate_from_evidence_change();

create or replace function app_private.recalculate_from_validation_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_value public.validations;
  movement_record record;
begin
  row_value := coalesce(new, old);

  if row_value.movement_id is not null then
    perform app_private.recalculate_movement_evidence_level(row_value.movement_id);
  end if;

  if row_value.evidence_id is not null then
    for movement_record in select movement_id from public.evidences where id = row_value.evidence_id loop
      perform app_private.recalculate_movement_evidence_level(movement_record.movement_id);
    end loop;
  end if;

  if row_value.document_id is not null then
    for movement_record in select distinct movement_id from public.evidences where document_id = row_value.document_id loop
      perform app_private.recalculate_movement_evidence_level(movement_record.movement_id);
    end loop;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger validations_recalculate_level
after insert or update or delete on public.validations
for each row execute function app_private.recalculate_from_validation_change();

create or replace function app_private.recalculate_from_reconciliation_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_value public.reconciliations;
begin
  row_value := coalesce(new, old);
  perform app_private.recalculate_movement_evidence_level(row_value.left_movement_id);
  perform app_private.recalculate_movement_evidence_level(row_value.right_movement_id);
  return coalesce(new, old);
end;
$$;

create trigger reconciliations_recalculate_level
after insert or update or delete on public.reconciliations
for each row execute function app_private.recalculate_from_reconciliation_change();

create or replace function app_private.recalculate_from_extraction_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  movement_record record;
begin
  for movement_record in select distinct movement_id from public.evidences where document_id = new.document_id loop
    perform app_private.recalculate_movement_evidence_level(movement_record.movement_id);
  end loop;
  return new;
end;
$$;

create trigger document_extractions_recalculate_level
after insert on public.document_extractions
for each row execute function app_private.recalculate_from_extraction_change();

create or replace function app_private.can_validate_subject(
  p_user_id uuid,
  p_movement_id uuid,
  p_evidence_id uuid,
  p_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.movements m
    where m.id = p_movement_id
      and app_private.has_permission(p_user_id,m.tenant_id,m.organization_id,m.unit_id,'evidence.validate')
  )
  or exists (
    select 1 from public.evidences e
    join public.movements m on m.id = e.movement_id
    where e.id = p_evidence_id
      and app_private.has_permission(p_user_id,m.tenant_id,m.organization_id,m.unit_id,'evidence.validate')
  )
  or exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and app_private.has_permission(p_user_id,d.tenant_id,d.organization_id,null,'evidence.validate')
  );
$$;

grant execute on function app_private.can_validate_subject(uuid,uuid,uuid,uuid) to authenticated;

alter table public.document_extractions enable row level security;
alter table public.evidences enable row level security;
alter table public.validations enable row level security;
alter table public.reconciliations enable row level security;

create policy document_extractions_select on public.document_extractions
for select to authenticated
using (
  exists (
    select 1 from public.documents d
    where d.id = document_id
      and app_private.has_permission(auth.uid(),d.tenant_id,d.organization_id,null,'evidence.read')
  )
);

create policy evidences_select on public.evidences
for select to authenticated
using (
  exists (
    select 1 from public.movements m
    where m.id = movement_id
      and app_private.has_permission(auth.uid(),m.tenant_id,m.organization_id,m.unit_id,'evidence.read')
  )
);

create policy evidences_insert on public.evidences
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.movements m
    where m.id = movement_id
      and app_private.has_permission(auth.uid(),m.tenant_id,m.organization_id,m.unit_id,'evidence.upload')
  )
);

create policy validations_select on public.validations
for select to authenticated
using (app_private.can_validate_subject(auth.uid(),movement_id,evidence_id,document_id));

create policy validations_insert_human on public.validations
for insert to authenticated
with check (
  automated = false
  and actor_user_id = auth.uid()
  and app_private.can_validate_subject(auth.uid(),movement_id,evidence_id,document_id)
);

create policy reconciliations_select on public.reconciliations
for select to authenticated
using (
  exists (
    select 1 from public.movements m
    where m.id = left_movement_id
      and app_private.has_permission(auth.uid(),m.tenant_id,m.organization_id,m.unit_id,'movement.read')
  )
);
