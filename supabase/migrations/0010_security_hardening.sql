drop policy if exists evidence_objects_delete on storage.objects;

revoke execute on function app_private.current_stock_quantity(uuid,uuid,uuid,uuid)
from public, anon, authenticated;

create or replace function app_private.has_active_membership(
  p_user_id uuid,
  p_tenant_id uuid,
  p_organization_id uuid default null,
  p_unit_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (auth.uid() is null or p_user_id = auth.uid())
    and exists (
      select 1
      from public.memberships m
      where m.user_id = p_user_id
        and m.tenant_id = p_tenant_id
        and m.status = 'active'
        and m.starts_at <= now()
        and (m.ends_at is null or m.ends_at > now())
        and (p_organization_id is null or m.organization_id = p_organization_id)
        and (p_unit_id is null or m.unit_id is null or m.unit_id = p_unit_id)
    );
$$;

create or replace function app_private.has_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (auth.uid() is null or p_user_id = auth.uid())
    and exists (
      select 1
      from public.memberships m
      join public.role_permissions rp on rp.role_id = m.role_id
      where m.user_id = p_user_id
        and m.tenant_id = p_tenant_id
        and m.organization_id = p_organization_id
        and rp.permission_code = p_permission_code
        and m.status = 'active'
        and m.starts_at <= now()
        and (m.ends_at is null or m.ends_at > now())
        and (p_unit_id is null or m.unit_id is null or m.unit_id = p_unit_id)
    );
$$;

create or replace function app_private.storage_path_authorized(
  p_user_id uuid,
  p_object_name text,
  p_permission_code text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  parts text[];
  path_tenant uuid;
  path_organization uuid;
begin
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    return false;
  end if;

  parts := string_to_array(p_object_name, '/');
  if array_length(parts, 1) < 4 then
    return false;
  end if;

  begin
    path_tenant := parts[1]::uuid;
    path_organization := parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return app_private.has_permission(
    p_user_id,
    path_tenant,
    path_organization,
    null,
    p_permission_code
  );
end;
$$;

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
  select
    (auth.uid() is null or p_user_id = auth.uid())
    and (
      exists (
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
      )
    );
$$;
