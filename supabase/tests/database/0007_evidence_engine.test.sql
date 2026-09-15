begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select has_table('public','evidences');
select has_table('public','document_extractions');
select has_table('public','validations');
select has_table('public','reconciliations');
select has_function('app_private','recalculate_movement_evidence_level',array['uuid']);

select throws_ok(
  $$insert into public.validations (validation_type,status,automated,rule_code) values ('human_audit','accepted',true,'audit')$$,
  '23514', null, 'automated validation can never represent a human audit'
);

select throws_ok(
  $$insert into public.validations (validation_type,status,automated,rule_code) values ('human_audit','accepted',false,'audit')$$,
  '23514', null, 'human audit requires an actor user'
);

select ok(
  (select count(*) = 0 from public.document_extractions),
  'extraction history starts append-only and empty'
);

select * from finish();
rollback;
