create table public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  movement_id uuid not null unique references public.movements(id) on delete restrict,
  buyer_counterparty_id uuid not null references public.counterparties(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  quantity_kg numeric(18,3) not null check (quantity_kg > 0),
  unit_price numeric(18,4) not null check (unit_price >= 0),
  total_amount numeric(18,2) generated always as (round(quantity_kg * unit_price, 2)) stored,
  fiscal_document_id uuid references public.documents(id) on delete restrict,
  sold_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sales_scope_time_idx on public.sales (tenant_id, organization_id, sold_at desc);
create index sales_buyer_idx on public.sales (buyer_counterparty_id, sold_at desc);
create index sales_material_idx on public.sales (tenant_id, material_id, sold_at desc);

create or replace function app_private.ensure_sale_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  movement_row public.movements;
  buyer_tenant uuid;
  buyer_owner_org uuid;
  document_tenant uuid;
  document_org uuid;
begin
  select * into movement_row
  from public.movements
  where id = new.movement_id;

  if movement_row.id is null then
    raise exception 'sale movement does not exist';
  end if;

  if movement_row.movement_type <> 'sale' then
    raise exception 'sale must reference a movement of type sale';
  end if;

  if movement_row.tenant_id <> new.tenant_id
     or movement_row.organization_id <> new.organization_id
     or movement_row.unit_id is distinct from new.unit_id
     or movement_row.material_id <> new.material_id
     or movement_row.quantity_kg <> new.quantity_kg then
    raise exception 'sale scope, material and quantity must match linked movement';
  end if;

  select tenant_id, organization_id
    into buyer_tenant, buyer_owner_org
  from public.counterparties
  where id = new.buyer_counterparty_id;

  if buyer_tenant is null
     or buyer_tenant <> new.tenant_id
     or buyer_owner_org <> new.organization_id then
    raise exception 'buyer counterparty must belong to seller organization and tenant';
  end if;

  if new.fiscal_document_id is not null then
    select tenant_id, organization_id
      into document_tenant, document_org
    from public.documents
    where id = new.fiscal_document_id;

    if document_tenant is null
       or document_tenant <> new.tenant_id
       or document_org <> new.organization_id then
      raise exception 'sale fiscal document must belong to seller organization and tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger sales_consistency
before insert or update of tenant_id, organization_id, unit_id, movement_id, buyer_counterparty_id, material_id, quantity_kg, fiscal_document_id
on public.sales
for each row execute function app_private.ensure_sale_consistency();

create or replace function app_private.protect_sale_after_posting()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  movement_status public.movement_status;
begin
  select status into movement_status
  from public.movements
  where id = old.movement_id;

  if movement_status in ('posted','voided') then
    raise exception 'sale linked to posted or voided movement is immutable';
  end if;

  return new;
end;
$$;

create trigger sales_protect_after_posting
before update or delete on public.sales
for each row execute function app_private.protect_sale_after_posting();

create or replace function app_private.audit_sale_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  movement_actor uuid;
begin
  select created_by into movement_actor
  from public.movements
  where id = new.movement_id;

  insert into public.audit_events (
    tenant_id,
    organization_id,
    actor_user_id,
    action,
    subject_type,
    subject_id,
    new_state
  ) values (
    new.tenant_id,
    new.organization_id,
    movement_actor,
    'sale.created',
    'sale',
    new.id,
    to_jsonb(new)
  );

  return new;
end;
$$;

create trigger sales_audit_insert
after insert on public.sales
for each row execute function app_private.audit_sale_insert();

alter table public.sales enable row level security;

create policy sales_select on public.sales
for select to authenticated
using (
  app_private.has_permission(
    auth.uid(),
    tenant_id,
    organization_id,
    unit_id,
    'movement.read'
  )
);

create policy sales_insert on public.sales
for insert to authenticated
with check (
  app_private.has_permission(
    auth.uid(),
    tenant_id,
    organization_id,
    unit_id,
    'sale.create'
  )
);

create policy sales_update_draft on public.sales
for update to authenticated
using (
  app_private.has_permission(
    auth.uid(),
    tenant_id,
    organization_id,
    unit_id,
    'sale.create'
  )
)
with check (
  app_private.has_permission(
    auth.uid(),
    tenant_id,
    organization_id,
    unit_id,
    'sale.create'
  )
);
