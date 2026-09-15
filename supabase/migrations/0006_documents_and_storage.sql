create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  document_type text not null,
  original_filename text not null,
  mime_type text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_bucket text not null,
  storage_path text not null,
  external_number text,
  external_key text,
  extraction_status public.review_status not null default 'pending',
  uploaded_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index documents_tenant_sha_idx on public.documents (tenant_id, sha256);
create index documents_tenant_external_key_idx on public.documents (tenant_id, external_key) where external_key is not null;
create index documents_scope_time_idx on public.documents (tenant_id, organization_id, uploaded_at desc);

create or replace function app_private.ensure_document_scope_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  org_tenant uuid;
begin
  select tenant_id into org_tenant from public.organizations where id = new.organization_id;
  if org_tenant is null or org_tenant <> new.tenant_id then
    raise exception 'document organization must belong to document tenant';
  end if;
  return new;
end;
$$;

create trigger documents_scope_consistency
before insert or update of tenant_id, organization_id on public.documents
for each row execute function app_private.ensure_document_scope_consistency();

create or replace function app_private.protect_document_original()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.tenant_id is distinct from old.tenant_id
     or new.organization_id is distinct from old.organization_id
     or new.uploaded_by is distinct from old.uploaded_by
     or new.original_filename is distinct from old.original_filename
     or new.mime_type is distinct from old.mime_type
     or new.sha256 is distinct from old.sha256
     or new.storage_bucket is distinct from old.storage_bucket
     or new.storage_path is distinct from old.storage_path
     or new.uploaded_at is distinct from old.uploaded_at then
    raise exception 'original document identity and storage fields are immutable';
  end if;
  return new;
end;
$$;

create trigger documents_protect_original
before update on public.documents
for each row execute function app_private.protect_document_original();

alter table public.weighings
  add column source_document_id uuid references public.documents(id) on delete set null;

create or replace function app_private.ensure_weighing_document_scope()
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
  if new.source_document_id is null then
    return new;
  end if;

  select tenant_id, organization_id into movement_tenant, movement_org
  from public.movements where id = new.movement_id;
  select tenant_id, organization_id into document_tenant, document_org
  from public.documents where id = new.source_document_id;

  if document_tenant is null
     or document_tenant <> movement_tenant
     or document_org <> movement_org then
    raise exception 'weighing source document must belong to movement scope';
  end if;
  return new;
end;
$$;

create trigger weighings_document_scope
before insert or update of movement_id, source_document_id on public.weighings
for each row execute function app_private.ensure_weighing_document_scope();

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence-documents', 'evidence-documents', false, 20971520)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

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

grant execute on function app_private.storage_path_authorized(uuid,text,text) to authenticated;

alter table public.documents enable row level security;

create policy documents_select on public.documents
for select to authenticated
using (app_private.has_permission(auth.uid(), tenant_id, organization_id, null, 'evidence.read'));

create policy documents_insert on public.documents
for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and storage_bucket = 'evidence-documents'
  and app_private.has_permission(auth.uid(), tenant_id, organization_id, null, 'evidence.upload')
);

create policy evidence_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'evidence-documents'
  and app_private.storage_path_authorized(auth.uid(), name, 'evidence.read')
);

create policy evidence_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidence-documents'
  and app_private.storage_path_authorized(auth.uid(), name, 'evidence.upload')
);

create policy evidence_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'evidence-documents'
  and app_private.storage_path_authorized(auth.uid(), name, 'evidence.upload')
);
