begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(5);

select has_table('public','documents');
select has_index('public','documents','documents_tenant_sha_idx');
select is((select public from storage.buckets where id='evidence-documents'),false,'evidence bucket is private');

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('12000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','documents@verdis.local',now(),now(),now(),'{}'::jsonb,'{}'::jsonb);
insert into public.tenants (id,slug,name) values ('23000000-0000-0000-0000-000000000001','documents-a','Documents A');
insert into public.organizations (id,tenant_id,legal_name,display_name) values ('33000000-0000-0000-0000-000000000001','23000000-0000-0000-0000-000000000001','Documents Org','Documents Org');

select lives_ok($$
  insert into public.documents (tenant_id,organization_id,uploaded_by,document_type,original_filename,mime_type,sha256,storage_bucket,storage_path)
  values
  ('23000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','weight_ticket','a.txt','text/plain',repeat('a',64),'evidence-documents','one/a.txt'),
  ('23000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','weight_ticket','b.txt','text/plain',repeat('a',64),'evidence-documents','two/b.txt')
$$,'same hash may be preserved as separate evidence records');

select is((select count(*)::int from public.documents where tenant_id='23000000-0000-0000-0000-000000000001' and sha256=repeat('a',64)),2,'duplicate hash candidates remain discoverable');

select * from finish();
rollback;
