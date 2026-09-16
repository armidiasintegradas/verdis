begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

insert into auth.users (
  id, instance_id, aud, role, email,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '21000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'sale-operator@verdis.local',
  now(), now(), now(), '{}'::jsonb, '{}'::jsonb
);

insert into public.tenants (id, slug, name) values
  ('22000000-0000-0000-0000-000000000001', 'sale-m1', 'Sale M1');

insert into public.organizations (id, tenant_id, legal_name, display_name) values
  ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Cooperativa Sale M1', 'Cooperativa Sale M1');

insert into public.units (id, tenant_id, organization_id, name, code) values
  ('24000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Galpão 01', 'GALPAO-01');

insert into public.materials (id, tenant_id, code, name, category) values
  ('25000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'PET', 'PET', 'plastico'),
  ('25000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 'PET-LOW', 'PET Estoque Baixo', 'plastico');

insert into public.counterparties (id, tenant_id, organization_id, external_name) values
  ('26000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Comprador Demo');

insert into public.memberships (
  id, tenant_id, organization_id, user_id, role_id, status
)
select
  '27000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  '23000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  r.id,
  'active'
from public.roles r where r.code = 'operator';

-- Seed stock through the canonical movement posting trigger.
insert into public.movements (
  id, tenant_id, organization_id, unit_id, movement_type, material_id,
  quantity_kg, occurred_at, created_by, status
) values
  ('28000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'receipt', '25000000-0000-0000-0000-000000000001', 3200, '2026-09-16T08:00:00-03:00', '21000000-0000-0000-0000-000000000001', 'draft'),
  ('28000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'receipt', '25000000-0000-0000-0000-000000000002', 320, '2026-09-16T08:01:00-03:00', '21000000-0000-0000-0000-000000000001', 'draft');

update public.movements set status = 'posted'
where id in ('28000000-0000-0000-0000-000000000001', '28000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select * from public.create_sale_draft_m1(
    '26000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001',
    1000, 3.10, '2026-09-16T18:35:00-03:00',
    '23000000-0000-0000-0000-000000000001',
    '24000000-0000-0000-0000-000000000001'
  ) $$,
  'atomic sale draft creation succeeds'
);
reset role;

select is(
  (select count(*)::int from public.sales where buyer_counterparty_id = '26000000-0000-0000-0000-000000000001' and quantity_kg = 1000 and unit_price = 3.10),
  1,
  'draft creation creates one coherent sale row'
);

select is(
  (select total_amount from public.sales where buyer_counterparty_id = '26000000-0000-0000-0000-000000000001' and quantity_kg = 1000 and unit_price = 3.10 limit 1),
  3100.00::numeric,
  'sale total is generated as 3100'
);

-- Capture canonical movement for later assertions.
create temporary table sale_ids as
select s.id as sale_id, s.movement_id
from public.sales s
where s.buyer_counterparty_id = '26000000-0000-0000-0000-000000000001'
  and s.quantity_kg = 1000
  and s.unit_price = 3.10
order by s.created_at
limit 1;

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ select * from public.register_sale_evidence_document(
    (select movement_id from sale_ids),
    'Documento_Venda_1279.pdf',
    'application/pdf',
    repeat('d',64),
    '22000000-0000-0000-0000-000000000001/23000000-0000-0000-0000-000000000001/' || (select movement_id::text from sale_ids) || '/Documento_Venda_1279.pdf',
    1000,
    3.10
  ) $$,
  'sale evidence document registration succeeds'
);
reset role;

select is(
  ((select claimed_fields ->> 'quantity_kg' from public.evidences where movement_id = (select movement_id from sale_ids))::numeric),
  1000::numeric,
  'sale evidence preserves claimed quantity'
);

select is(
  ((select claimed_fields ->> 'unit_price' from public.evidences where movement_id = (select movement_id from sale_ids))::numeric),
  3.10::numeric,
  'sale evidence preserves claimed unit price'
);

select is(
  ((select claimed_fields ->> 'total_amount' from public.evidences where movement_id = (select movement_id from sale_ids))::numeric),
  3100.00::numeric,
  'sale evidence preserves claimed total'
);

select ok(
  (select fiscal_document_id is not null from public.sales where id = (select sale_id from sale_ids)),
  'registered evidence document is linked as the sale fiscal document'
);

insert into public.document_extractions (document_id, provider, model_name, model_version, extracted_fields, confidence)
select e.document_id, 'test-provider', 'sale-reader', 'v1', '{"quantity_kg":1000,"unit_price":3.20,"total_amount":3200}'::jsonb, 0.9900
from public.evidences e where e.movement_id = (select movement_id from sale_ids);

update public.evidences
set extracted_fields = '{"quantity_kg":1000,"unit_price":3.20,"total_amount":3200}'::jsonb
where movement_id = (select movement_id from sale_ids);

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select * from public.confirm_sale_m1(
    (select movement_id from sale_ids),
    'keep_registered',
    (select id from public.evidences where movement_id = (select movement_id from sale_ids)),
    null
  ) $$,
  'justification is required to keep the registered sale price',
  'keep_registered divergence requires justification'
);

select lives_ok(
  $$ select * from public.confirm_sale_m1(
    (select movement_id from sale_ids),
    'keep_registered',
    (select id from public.evidences where movement_id = (select movement_id from sale_ids)),
    'Preço negociado confirmado pela equipe comercial.'
  ) $$,
  'keep_registered confirms with a nonblank reason'
);
reset role;

select is(
  (select unit_price from public.sales where id = (select sale_id from sale_ids)),
  3.10::numeric,
  'keep_registered preserves unit price 3.10'
);

select is(
  (select total_amount from public.sales where id = (select sale_id from sale_ids)),
  3100.00::numeric,
  'keep_registered preserves generated total 3100'
);

select is(
  (select rule_code from public.validations where movement_id = (select movement_id from sale_ids) and validation_type = 'operator_resolution'),
  'SALE_KEEP_REGISTERED_PRICE',
  'keep_registered persists the sale resolution rule'
);

select is(
  (select reason from public.validations where movement_id = (select movement_id from sale_ids) and validation_type = 'operator_resolution'),
  'Preço negociado confirmado pela equipe comercial.',
  'keep_registered persists the justification'
);

select is(
  (select delta_kg from public.stock_ledger_entries where movement_id = (select movement_id from sale_ids) and effect_kind = 'post'),
  (-1000)::numeric,
  'posted sale creates exactly a -1000kg ledger effect'
);

select is(
  app_private.current_stock_quantity(
    '22000000-0000-0000-0000-000000000001',
    '23000000-0000-0000-0000-000000000001',
    '24000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001'
  ),
  2200::numeric,
  'canonical sale leaves 2200kg in stock'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ select * from public.confirm_sale_m1(
    (select movement_id from sale_ids), 'registered_only', null, null
  ) $$,
  'sale is not draft',
  'second confirmation is rejected'
);
reset role;

select is(
  (select count(*)::int from public.stock_ledger_entries where movement_id = (select movement_id from sale_ids)),
  1,
  'second confirmation cannot duplicate the stock effect'
);

-- Insufficient stock path: create a draft against the 320kg material, then try to sell 400kg.
set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);
create temporary table low_sale_ids as
select * from public.create_sale_draft_m1(
  '26000000-0000-0000-0000-000000000001',
  '25000000-0000-0000-0000-000000000002',
  400, 3.10, '2026-09-16T19:00:00-03:00',
  '23000000-0000-0000-0000-000000000001',
  '24000000-0000-0000-0000-000000000001'
);

select throws_ok(
  $$ select * from public.confirm_sale_m1(
    (select movement_id from low_sale_ids), 'registered_only', null, null
  ) $$,
  'insufficient stock for sale',
  'server rejects a sale when current stock is insufficient'
);
reset role;

select * from finish();
rollback;
