begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

insert into auth.users (
  id, instance_id, aud, role, email,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '11000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'receipt-operator@verdis.local',
  now(), now(), now(), '{}'::jsonb, '{}'::jsonb
);

insert into public.tenants (id, slug, name) values
  ('12000000-0000-0000-0000-000000000001', 'receipt-m1', 'Receipt M1');

insert into public.organizations (id, tenant_id, legal_name, display_name) values
  ('13000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Cooperativa Receipt M1', 'Cooperativa Receipt M1');

insert into public.units (id, tenant_id, organization_id, name, code) values
  ('14000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'Galpão 01', 'GALPAO-01');

insert into public.materials (id, tenant_id, code, name, category) values
  ('15000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'PAPELAO', 'Papelão Ondulado', 'papel');

insert into public.memberships (
  id, tenant_id, organization_id, user_id, role_id, status
)
select
  '16000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  r.id,
  'active'
from public.roles r where r.code = 'operator';

insert into public.movements (
  id, tenant_id, organization_id, unit_id, movement_type, material_id,
  quantity_kg, occurred_at, created_by, status
) values
  ('17000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'receipt', '15000000-0000-0000-0000-000000000001', 480, '2026-09-16T08:00:00-03:00', '11000000-0000-0000-0000-000000000001', 'draft'),
  ('17000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'receipt', '15000000-0000-0000-0000-000000000001', 480, '2026-09-16T08:10:00-03:00', '11000000-0000-0000-0000-000000000001', 'draft'),
  ('17000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'receipt', '15000000-0000-0000-0000-000000000001', 480, '2026-09-16T08:20:00-03:00', '11000000-0000-0000-0000-000000000001', 'draft'),
  ('17000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'receipt', '15000000-0000-0000-0000-000000000001', 480, '2026-09-16T08:30:00-03:00', '11000000-0000-0000-0000-000000000001', 'draft'),
  ('17000000-0000-0000-0000-000000000005', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'receipt', '15000000-0000-0000-0000-000000000001', 480, '2026-09-16T08:40:00-03:00', '11000000-0000-0000-0000-000000000001', 'draft');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select * from public.register_receipt_evidence_document(
    '17000000-0000-0000-0000-000000000002',
    'Ticket_009182.jpg',
    'image/jpeg',
    repeat('a', 64),
    '12000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/17000000-0000-0000-0000-000000000002/ticket.jpg',
    480
  ) $$,
  'document/evidence registration succeeds'
);
reset role;

select is(
  (select count(*)::int from public.documents where original_filename = 'Ticket_009182.jpg'),
  1,
  'registration creates one document'
);

select is(
  (select count(*)::int from public.evidences where movement_id = '17000000-0000-0000-0000-000000000002'),
  1,
  'registration creates one evidence link'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000001', 'registered_only', null, null
  ) $$,
  'registered_only confirms a receipt without evidence'
);
reset role;

select is(
  (select status::text from public.movements where id = '17000000-0000-0000-0000-000000000001'),
  'posted',
  'registered_only posts the receipt'
);

select is(
  (select delta_kg from public.stock_ledger_entries where movement_id = '17000000-0000-0000-0000-000000000001' and effect_kind = 'post'),
  480::numeric,
  'registered_only posts +480kg to the ledger'
);

select is(
  (select count(*)::int from public.validations where movement_id = '17000000-0000-0000-0000-000000000001' and validation_type = 'operator_resolution'),
  0,
  'registered_only does not create an operator-resolution validation'
);

insert into public.document_extractions (document_id, provider, model_name, model_version, extracted_fields, confidence)
select e.document_id, 'test-provider', 'receipt-reader', 'v1', '{"quantity_kg":482}'::jsonb, 0.9900
from public.evidences e where e.movement_id = '17000000-0000-0000-0000-000000000002';

update public.evidences
set extracted_fields = '{"quantity_kg":482}'::jsonb
where movement_id = '17000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select * from public.register_receipt_evidence_document(
  '17000000-0000-0000-0000-000000000003',
  'Ticket_009183.jpg', 'image/jpeg', repeat('b',64),
  '12000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/17000000-0000-0000-0000-000000000003/ticket.jpg',
  480
);
reset role;

insert into public.document_extractions (document_id, provider, model_name, model_version, extracted_fields, confidence)
select e.document_id, 'test-provider', 'receipt-reader', 'v1', '{"quantity_kg":482}'::jsonb, 0.9900
from public.evidences e where e.movement_id = '17000000-0000-0000-0000-000000000003';

update public.evidences
set extracted_fields = '{"quantity_kg":482}'::jsonb
where movement_id = '17000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000003',
    'keep_registered',
    (select id from public.evidences where movement_id = '17000000-0000-0000-0000-000000000003'),
    null
  ) $$,
  'justification is required to keep the registered quantity',
  'keep_registered divergence requires justification'
);

select lives_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000002',
    'use_document',
    (select id from public.evidences where movement_id = '17000000-0000-0000-0000-000000000002'),
    null
  ) $$,
  'use_document confirms processed evidence'
);
reset role;

select is(
  (select quantity_kg from public.movements where id = '17000000-0000-0000-0000-000000000002'),
  482::numeric,
  'use_document adopts 482kg before posting'
);

select is(
  (select delta_kg from public.stock_ledger_entries where movement_id = '17000000-0000-0000-0000-000000000002' and effect_kind = 'post'),
  482::numeric,
  'use_document posts +482kg to the ledger'
);

select is(
  ((select claimed_fields ->> 'quantity_kg' from public.evidences where movement_id = '17000000-0000-0000-0000-000000000002')::numeric),
  480::numeric,
  'original 480kg claim remains preserved'
);

select is(
  (select rule_code from public.validations where movement_id = '17000000-0000-0000-0000-000000000002' and validation_type = 'operator_resolution'),
  'RECEIPT_USE_DOCUMENT_QUANTITY',
  'use_document records the human resolution rule'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000003',
    'keep_registered',
    (select id from public.evidences where movement_id = '17000000-0000-0000-0000-000000000003'),
    'Quantidade operacional confirmada pela equipe.'
  ) $$,
  'keep_registered confirms with a nonblank reason'
);
reset role;

select is(
  (select quantity_kg from public.movements where id = '17000000-0000-0000-0000-000000000003'),
  480::numeric,
  'keep_registered preserves 480kg'
);

select is(
  (select rule_code from public.validations where movement_id = '17000000-0000-0000-0000-000000000003' and validation_type = 'operator_resolution'),
  'RECEIPT_KEEP_REGISTERED_QUANTITY',
  'keep_registered records the human resolution rule'
);

select is(
  (select reason from public.validations where movement_id = '17000000-0000-0000-0000-000000000003' and validation_type = 'operator_resolution'),
  'Quantidade operacional confirmada pela equipe.',
  'keep_registered preserves the justification'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000002', 'registered_only', null, null
  ) $$,
  'receipt is not draft',
  'second confirmation of a posted receipt is rejected'
);
reset role;

select is(
  (select count(*)::int from public.stock_ledger_entries where movement_id = '17000000-0000-0000-0000-000000000002'),
  1,
  'second confirmation cannot duplicate the ledger effect'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
select * from public.register_receipt_evidence_document(
  '17000000-0000-0000-0000-000000000004',
  'Ticket_009184.jpg', 'image/jpeg', repeat('c',64),
  '12000000-0000-0000-0000-000000000001/13000000-0000-0000-0000-000000000001/17000000-0000-0000-0000-000000000004/ticket.jpg',
  480
);

select throws_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000004',
    'use_document',
    (select id from public.evidences where movement_id = '17000000-0000-0000-0000-000000000004'),
    null
  ) $$,
  'receipt evidence has not been processed',
  'use_document rejects evidence without a completed extraction'
);

select throws_ok(
  $$ select * from public.confirm_receipt_m1(
    '17000000-0000-0000-0000-000000000005',
    'use_document',
    (select id from public.evidences where movement_id = '17000000-0000-0000-0000-000000000002'),
    null
  ) $$,
  'receipt evidence not found',
  'evidence from another movement is rejected'
);
reset role;

select * from finish();
rollback;
