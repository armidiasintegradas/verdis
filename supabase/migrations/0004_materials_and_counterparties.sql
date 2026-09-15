create table public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null,
  default_unit text not null default 'kg' check (default_unit = 'kg'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index materials_tenant_active_idx on public.materials (tenant_id, active);

create table public.material_aliases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, alias)
);

create table public.counterparties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  linked_organization_id uuid references public.organizations(id) on delete restrict,
  external_name text,
  external_tax_id text,
  created_at timestamptz not null default now(),
  check (
    linked_organization_id is not null
    or (external_name is not null and btrim(external_name) <> '')
  )
);

create index counterparties_scope_idx on public.counterparties (tenant_id, organization_id);
create index counterparties_external_tax_idx on public.counterparties (tenant_id, external_tax_id);

create or replace function app_private.ensure_material_alias_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  material_tenant uuid;
begin
  select tenant_id into material_tenant from public.materials where id = new.material_id;
  if material_tenant is null or material_tenant <> new.tenant_id then
    raise exception 'material alias tenant must match material tenant';
  end if;
  return new;
end;
$$;

create trigger material_aliases_tenant_consistency
before insert or update of tenant_id, material_id on public.material_aliases
for each row execute function app_private.ensure_material_alias_tenant();

create or replace function app_private.ensure_counterparty_scope_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owner_tenant uuid;
  linked_tenant uuid;
begin
  select tenant_id into owner_tenant from public.organizations where id = new.organization_id;
  if owner_tenant is null or owner_tenant <> new.tenant_id then
    raise exception 'counterparty owner organization must belong to tenant';
  end if;

  if new.linked_organization_id is not null then
    select tenant_id into linked_tenant from public.organizations where id = new.linked_organization_id;
    if linked_tenant is null or linked_tenant <> new.tenant_id then
      raise exception 'linked counterparty organization must belong to tenant';
    end if;
  end if;

  return new;
end;
$$;

create trigger counterparties_scope_consistency
before insert or update of tenant_id, organization_id, linked_organization_id on public.counterparties
for each row execute function app_private.ensure_counterparty_scope_consistency();

alter table public.materials enable row level security;
alter table public.material_aliases enable row level security;
alter table public.counterparties enable row level security;

create policy materials_select_tenant_members on public.materials
for select to authenticated
using (app_private.has_active_membership(auth.uid(), tenant_id, null, null));

create policy material_aliases_select_tenant_members on public.material_aliases
for select to authenticated
using (app_private.has_active_membership(auth.uid(), tenant_id, null, null));

create policy counterparties_select_scope on public.counterparties
for select to authenticated
using (app_private.has_active_membership(auth.uid(), tenant_id, organization_id, null));
