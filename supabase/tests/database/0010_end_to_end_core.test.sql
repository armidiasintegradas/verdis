begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

-- 1) Empresa Demo receives 120 kg so the later outbound movement has real stock.
insert into public.movements (
  id, tenant_id, organization_id, unit_id, movement_type, material_id,
  quantity_kg, occurred_at, created_by
) values (
  '00000000-0000-0000-0000-000000010001',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002001',
  '00000000-0000-0000-0000-000000003001',
  'inbound',
  '00000000-0000-0000-0000-000000004001',
  120,
  '2026-09-15T09:00:00-03:00',
  '00000000-0000-0000-0000-000000000101'
);
update public.movements
set status = 'posted'
where id = '00000000-0000-0000-0000-000000010001';

select is(
  (
    select quantity_kg
    from public.current_stock
    where organization_id = '00000000-0000-0000-0000-000000002001'
      and unit_id = '00000000-0000-0000-0000-000000003001'
      and material_id = '00000000-0000-0000-0000-000000004001'
  ),
  120::numeric,
  'Empresa Demo starts the transfer chain with 120 kg of real stock'
);

-- 2) Empresa Demo sends 120 kg to Cooperativa Demo.
insert into public.movements (
  id, tenant_id, organization_id, unit_id, movement_type, material_id,
  quantity_kg, destination_organization_id, destination_unit_id,
  occurred_at, created_by
) values (
  '00000000-0000-0000-0000-000000010002',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002001',
  '00000000-0000-0000-0000-000000003001',
  'outbound',
  '00000000-0000-0000-0000-000000004001',
  120,
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000003002',
  '2026-09-15T10:00:00-03:00',
  '00000000-0000-0000-0000-000000000101'
);
update public.movements
set status = 'posted'
where id = '00000000-0000-0000-0000-000000010002';

select is(
  (
    select quantity_kg
    from public.current_stock
    where organization_id = '00000000-0000-0000-0000-000000002001'
      and unit_id = '00000000-0000-0000-0000-000000003001'
      and material_id = '00000000-0000-0000-0000-000000004001'
  ),
  0::numeric,
  'Empresa Demo stock falls to zero after the outbound movement'
);

-- 3) Cooperativa Demo receives the same 120 kg.
insert into public.movements (
  id, tenant_id, organization_id, unit_id, movement_type, material_id,
  quantity_kg, source_organization_id, source_unit_id,
  occurred_at, created_by
) values (
  '00000000-0000-0000-0000-000000010003',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000003002',
  'inbound',
  '00000000-0000-0000-0000-000000004001',
  120,
  '00000000-0000-0000-0000-000000002001',
  '00000000-0000-0000-0000-000000003001',
  '2026-09-15T10:20:00-03:00',
  '00000000-0000-0000-0000-000000000102'
);
update public.movements
set status = 'posted'
where id = '00000000-0000-0000-0000-000000010003';

select is(
  (
    select quantity_kg
    from public.current_stock
    where organization_id = '00000000-0000-0000-0000-000000002002'
      and unit_id = '00000000-0000-0000-0000-000000003002'
      and material_id = '00000000-0000-0000-0000-000000004001'
  ),
  120::numeric,
  'Cooperativa Demo stock becomes 120 kg after receipt'
);

-- 4) Original ticket becomes evidence for the cooperative inbound movement.
insert into public.documents (
  id, tenant_id, organization_id, uploaded_by, document_type,
  original_filename, mime_type, sha256, storage_bucket, storage_path,
  external_number
) values (
  '00000000-0000-0000-0000-000000020001',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000000102',
  'weight_ticket',
  'ticket-120kg.pdf',
  'application/pdf',
  repeat('1',64),
  'evidence-documents',
  '00000000-0000-0000-0000-000000001000/00000000-0000-0000-0000-000000002002/2026/09/ticket-120kg.pdf',
  'TICKET-120'
);

insert into public.evidences (
  id, movement_id, document_id, evidence_type,
  claimed_fields, status, created_by
) values (
  '00000000-0000-0000-0000-000000021001',
  '00000000-0000-0000-0000-000000010003',
  '00000000-0000-0000-0000-000000020001',
  'weight_ticket',
  '{"net_weight_kg":120}'::jsonb,
  'pending',
  '00000000-0000-0000-0000-000000000102'
);

select is(
  (select evidence_level::text from public.movements where id='00000000-0000-0000-0000-000000010003'),
  'EVIDENCED',
  'attached original document raises the movement to EVIDENCED'
);

-- 5) Automatic extraction verifies the document but does not audit it.
insert into public.document_extractions (
  id, document_id, provider, model_name, model_version,
  extracted_fields, confidence
) values (
  '00000000-0000-0000-0000-000000022001',
  '00000000-0000-0000-0000-000000020001',
  'test-provider',
  'document-reader',
  'v1',
  '{"net_weight_kg":120,"date":"2026-09-15"}'::jsonb,
  0.9900
);

select is(
  (select evidence_level::text from public.movements where id='00000000-0000-0000-0000-000000010003'),
  'DOCUMENT_VERIFIED',
  'document extraction raises the movement to DOCUMENT_VERIFIED'
);

-- 6) Human acceptance produces VALIDATED.
insert into public.validations (
  id, movement_id, evidence_id, validation_type, status,
  automated, actor_user_id, rule_code, reason
) values (
  '00000000-0000-0000-0000-000000023001',
  '00000000-0000-0000-0000-000000010003',
  '00000000-0000-0000-0000-000000021001',
  'document_match',
  'accepted',
  false,
  '00000000-0000-0000-0000-000000000102',
  'weight_ticket_match',
  'Ticket confirms declared receipt weight.'
);

select is(
  (select evidence_level::text from public.movements where id='00000000-0000-0000-0000-000000010003'),
  'VALIDATED',
  'accepted human validation raises the movement to VALIDATED'
);

-- 7) Independent outbound/inbound movements reconcile with zero mass divergence.
insert into public.reconciliations (
  id, left_movement_id, right_movement_id, status,
  quantity_difference_kg, match_score, reviewed_by
) values (
  '00000000-0000-0000-0000-000000024001',
  '00000000-0000-0000-0000-000000010002',
  '00000000-0000-0000-0000-000000010003',
  'accepted',
  0,
  1.0000,
  '00000000-0000-0000-0000-000000000102'
);

select is(
  (select quantity_difference_kg from public.reconciliations where id='00000000-0000-0000-0000-000000024001'),
  0::numeric,
  'the two sides reconcile with zero mass difference'
);

select is(
  (select evidence_level::text from public.movements where id='00000000-0000-0000-0000-000000010003'),
  'RECONCILED',
  'accepted reconciliation raises the cooperative movement to RECONCILED'
);

-- 8) Cooperative sells 50 kg; commercial projection agrees with the mass movement.
insert into public.counterparties (
  id, tenant_id, organization_id, external_name, external_tax_id
) values (
  '00000000-0000-0000-0000-000000005003',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  'Recicladora Demo',
  '00000000000300'
);

insert into public.movements (
  id, tenant_id, organization_id, unit_id, movement_type, material_id,
  quantity_kg, destination_counterparty_id, occurred_at, created_by
) values (
  '00000000-0000-0000-0000-000000010004',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000003002',
  'sale',
  '00000000-0000-0000-0000-000000004001',
  50,
  '00000000-0000-0000-0000-000000005003',
  '2026-09-15T15:00:00-03:00',
  '00000000-0000-0000-0000-000000000102'
);

insert into public.sales (
  id, tenant_id, organization_id, unit_id, movement_id,
  buyer_counterparty_id, material_id, quantity_kg, unit_price, sold_at
) values (
  '00000000-0000-0000-0000-000000025001',
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000002002',
  '00000000-0000-0000-0000-000000003002',
  '00000000-0000-0000-0000-000000010004',
  '00000000-0000-0000-0000-000000005003',
  '00000000-0000-0000-0000-000000004001',
  50,
  3.10,
  '2026-09-15T15:00:00-03:00'
);

select is(
  (select total_amount from public.sales where id='00000000-0000-0000-0000-000000025001'),
  155.00::numeric,
  'sale commercial total is derived from movement quantity and price'
);

update public.movements
set status = 'posted'
where id = '00000000-0000-0000-0000-000000010004';

select is(
  (
    select quantity_kg
    from public.current_stock
    where organization_id = '00000000-0000-0000-0000-000000002002'
      and unit_id = '00000000-0000-0000-0000-000000003002'
      and material_id = '00000000-0000-0000-0000-000000004001'
  ),
  70::numeric,
  'cooperative stock is 70 kg after selling 50 kg from 120 kg'
);

select ok(
  (
    select count(*) >= 10
    from public.audit_events
    where subject_id in (
      '00000000-0000-0000-0000-000000010001',
      '00000000-0000-0000-0000-000000010002',
      '00000000-0000-0000-0000-000000010003',
      '00000000-0000-0000-0000-000000010004',
      '00000000-0000-0000-0000-000000020001',
      '00000000-0000-0000-0000-000000021001',
      '00000000-0000-0000-0000-000000023001',
      '00000000-0000-0000-0000-000000024001',
      '00000000-0000-0000-0000-000000025001'
    )
  ),
  'operational chain produces an append-only audit trail'
);

-- 9) RLS proof: Empresa Demo cannot read Cooperativa Demo or another tenant.
insert into public.tenants (id, slug, name)
values ('00000000-0000-0000-0000-000000009000','isolated-tenant','Isolated Tenant');
insert into public.organizations (id, tenant_id, legal_name, display_name)
values (
  '00000000-0000-0000-0000-000000009001',
  '00000000-0000-0000-0000-000000009000',
  'Isolated Org','Isolated Org'
);

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.organizations where id='00000000-0000-0000-0000-000000002002'),
  0,
  'Empresa Demo cannot read Cooperativa Demo without a membership'
);

select is(
  (select count(*)::int from public.organizations where id='00000000-0000-0000-0000-000000009001'),
  0,
  'Empresa Demo cannot read an organization from another tenant'
);

reset role;
select * from finish();
rollback;
