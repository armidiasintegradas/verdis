create table public.movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  movement_type public.movement_type not null,
  material_id uuid not null references public.materials(id) on delete restrict,
  quantity_kg numeric(18,3) not null,
  source_organization_id uuid references public.organizations(id) on delete restrict,
  source_unit_id uuid references public.units(id) on delete restrict,
  source_counterparty_id uuid references public.counterparties(id) on delete restrict,
  destination_organization_id uuid references public.organizations(id) on delete restrict,
  destination_unit_id uuid references public.units(id) on delete restrict,
  destination_counterparty_id uuid references public.counterparties(id) on delete restrict,
  occurred_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  status public.movement_status not null default 'draft',
  evidence_level public.evidence_level not null default 'AUTODECLARED',
  adjustment_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (movement_type = 'adjustment' and quantity_kg <> 0 and adjustment_reason is not null and btrim(adjustment_reason) <> '')
    or
    (movement_type <> 'adjustment' and quantity_kg > 0)
  )
);

create index movements_scope_time_idx on public.movements (tenant_id, organization_id, unit_id, occurred_at desc);
create index movements_material_time_idx on public.movements (tenant_id, material_id, occurred_at desc);

create table public.weighings (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.movements(id) on delete cascade,
  gross_weight_kg numeric(18,3) not null check (gross_weight_kg >= 0),
  tare_weight_kg numeric(18,3) not null check (tare_weight_kg >= 0),
  net_weight_kg numeric(18,3) generated always as (gross_weight_kg - tare_weight_kg) stored,
  declared_weight_kg numeric(18,3) check (declared_weight_kg is null or declared_weight_kg >= 0),
  weighed_at timestamptz not null,
  scale_name text,
  vehicle_plate text,
  created_at timestamptz not null default now(),
  check (gross_weight_kg >= tare_weight_kg)
);

create index weighings_movement_idx on public.weighings (movement_id);

create or replace function app_private.ensure_movement_scope_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owner_tenant uuid;
  check_tenant uuid;
  check_org uuid;
begin
  select tenant_id into owner_tenant from public.organizations where id = new.organization_id;
  if owner_tenant is null or owner_tenant <> new.tenant_id then
    raise exception 'movement organization must belong to movement tenant';
  end if;

  if new.unit_id is not null then
    select tenant_id, organization_id into check_tenant, check_org from public.units where id = new.unit_id;
    if check_tenant is null or check_tenant <> new.tenant_id or check_org <> new.organization_id then
      raise exception 'movement unit must belong to movement organization and tenant';
    end if;
  end if;

  select tenant_id into check_tenant from public.materials where id = new.material_id;
  if check_tenant is null or check_tenant <> new.tenant_id then
    raise exception 'movement material must belong to movement tenant';
  end if;

  if new.source_organization_id is not null then
    select tenant_id into check_tenant from public.organizations where id = new.source_organization_id;
    if check_tenant is null or check_tenant <> new.tenant_id then
      raise exception 'source organization must belong to movement tenant';
    end if;
  end if;

  if new.source_unit_id is not null then
    select tenant_id, organization_id into check_tenant, check_org from public.units where id = new.source_unit_id;
    if check_tenant is null or check_tenant <> new.tenant_id then
      raise exception 'source unit must belong to movement tenant';
    end if;
    if new.source_organization_id is not null and check_org <> new.source_organization_id then
      raise exception 'source unit must belong to source organization';
    end if;
  end if;

  if new.destination_organization_id is not null then
    select tenant_id into check_tenant from public.organizations where id = new.destination_organization_id;
    if check_tenant is null or check_tenant <> new.tenant_id then
      raise exception 'destination organization must belong to movement tenant';
    end if;
  end if;

  if new.destination_unit_id is not null then
    select tenant_id, organization_id into check_tenant, check_org from public.units where id = new.destination_unit_id;
    if check_tenant is null or check_tenant <> new.tenant_id then
      raise exception 'destination unit must belong to movement tenant';
    end if;
    if new.destination_organization_id is not null and check_org <> new.destination_organization_id then
      raise exception 'destination unit must belong to destination organization';
    end if;
  end if;

  if new.source_counterparty_id is not null then
    select tenant_id, organization_id into check_tenant, check_org from public.counterparties where id = new.source_counterparty_id;
    if check_tenant is null or check_tenant <> new.tenant_id or check_org <> new.organization_id then
      raise exception 'source counterparty must belong to movement organization and tenant';
    end if;
  end if;

  if new.destination_counterparty_id is not null then
    select tenant_id, organization_id into check_tenant, check_org from public.counterparties where id = new.destination_counterparty_id;
    if check_tenant is null or check_tenant <> new.tenant_id or check_org <> new.organization_id then
      raise exception 'destination counterparty must belong to movement organization and tenant';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger movements_scope_consistency
before insert or update of tenant_id, organization_id, unit_id, material_id, source_organization_id, source_unit_id, source_counterparty_id, destination_organization_id, destination_unit_id, destination_counterparty_id
on public.movements
for each row execute function app_private.ensure_movement_scope_consistency();

create or replace function app_private.protect_posted_movement()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status in ('posted','voided') and (
    new.tenant_id is distinct from old.tenant_id or
    new.organization_id is distinct from old.organization_id or
    new.unit_id is distinct from old.unit_id or
    new.movement_type is distinct from old.movement_type or
    new.material_id is distinct from old.material_id or
    new.quantity_kg is distinct from old.quantity_kg or
    new.source_organization_id is distinct from old.source_organization_id or
    new.source_unit_id is distinct from old.source_unit_id or
    new.source_counterparty_id is distinct from old.source_counterparty_id or
    new.destination_organization_id is distinct from old.destination_organization_id or
    new.destination_unit_id is distinct from old.destination_unit_id or
    new.destination_counterparty_id is distinct from old.destination_counterparty_id or
    new.occurred_at is distinct from old.occurred_at or
    new.adjustment_reason is distinct from old.adjustment_reason
  ) then
    raise exception 'posted or voided movement mass-affecting fields are immutable';
  end if;

  if old.status = 'posted' and new.status = 'draft' then
    raise exception 'posted movement cannot return to draft';
  end if;

  if old.status = 'voided' and new.status <> 'voided' then
    raise exception 'voided movement cannot be reactivated';
  end if;

  return new;
end;
$$;

create trigger movements_protect_posted
before update on public.movements
for each row execute function app_private.protect_posted_movement();

alter table public.movements enable row level security;
alter table public.weighings enable row level security;

create policy movements_select on public.movements
for select to authenticated
using (app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'movement.read'));

create policy movements_insert on public.movements
for insert to authenticated
with check (
  created_by = auth.uid()
  and app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'movement.create')
);

create policy movements_update on public.movements
for update to authenticated
using (
  app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'movement.correct')
  or (
    status = 'draft'
    and created_by = auth.uid()
    and app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'movement.create')
  )
)
with check (
  app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'movement.correct')
  or (
    created_by = auth.uid()
    and app_private.has_permission(auth.uid(), tenant_id, organization_id, unit_id, 'movement.create')
  )
);

create policy weighings_select on public.weighings
for select to authenticated
using (
  exists (
    select 1 from public.movements m
    where m.id = movement_id
      and app_private.has_permission(auth.uid(), m.tenant_id, m.organization_id, m.unit_id, 'movement.read')
  )
);

create policy weighings_insert on public.weighings
for insert to authenticated
with check (
  exists (
    select 1 from public.movements m
    where m.id = movement_id
      and app_private.has_permission(auth.uid(), m.tenant_id, m.organization_id, m.unit_id, 'movement.create')
  )
);
