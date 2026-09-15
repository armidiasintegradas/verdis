create schema if not exists app_private;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text not null,
  status public.tenant_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  legal_name text not null,
  display_name text not null,
  tax_id text,
  created_at timestamptz not null default now(),
  unique (tenant_id, tax_id)
);

create index organizations_tenant_idx on public.organizations (tenant_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index units_tenant_org_idx on public.units (tenant_id, organization_id);

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function app_private.ensure_unit_tenant_matches_organization()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  parent_tenant_id uuid;
begin
  select o.tenant_id
    into parent_tenant_id
    from public.organizations o
   where o.id = new.organization_id;

  if parent_tenant_id is null then
    raise exception 'organization % does not exist', new.organization_id;
  end if;

  if new.tenant_id <> parent_tenant_id then
    raise exception 'unit tenant must match parent organization tenant';
  end if;

  return new;
end;
$$;

create trigger units_tenant_consistency
before insert or update of tenant_id, organization_id on public.units
for each row execute function app_private.ensure_unit_tenant_matches_organization();
