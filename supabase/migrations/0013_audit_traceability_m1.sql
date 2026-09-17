-- Verdis M1 — Audit & Traceability foundation.
-- Additive only: audit_events remains append-only and stock_ledger_entries remains
-- the sole quantitative stock truth.

alter table public.audit_events
  add column correlation_id uuid,
  add column causation_event_id uuid references public.audit_events(id) on delete restrict,
  add column justification text,
  add column unit_id uuid references public.units(id) on delete restrict;

create index audit_events_correlation_idx
  on public.audit_events (tenant_id, correlation_id, occurred_at desc)
  where correlation_id is not null;

create index audit_events_causation_idx
  on public.audit_events (causation_event_id)
  where causation_event_id is not null;

insert into public.permissions (code, description) values
  ('audit.review','Review auditable events and exceptions'),
  ('audit.assign','Assign audit exceptions for review'),
  ('audit.resolve','Resolve audit exceptions with structured outcome'),
  ('audit.manage','Manage audit review workflow'),
  ('traceability.read','Read custody traceability'),
  ('traceability.operate','Operate custody traceability')
on conflict (code) do nothing;

-- Platform administrators receive all M1 capabilities explicitly because the
-- original cross-join grant ran before these permissions existed.
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
join public.permissions p on p.code in (
  'audit.review','audit.assign','audit.resolve','audit.manage',
  'traceability.read','traceability.operate'
)
where r.code='platform_admin'
on conflict do nothing;

-- Auditors/analysts review evidence and traceability but do not operate custody.
insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values
  ('audit.review'),('audit.assign'),('audit.resolve'),('traceability.read')
) as x(permission_code)
where r.code in ('auditor','verdis_analyst','inspector')
on conflict do nothing;

-- Managers may administer audit workflow and operate traceability in their scope.
insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values
  ('audit.review'),('audit.assign'),('audit.resolve'),('audit.manage'),
  ('traceability.read'),('traceability.operate')
) as x(permission_code)
where r.code in ('cooperative_manager','environmental_manager','event_manager')
on conflict do nothing;

-- Operational roles can participate in custody without gaining audit resolution.
insert into public.role_permissions (role_id, permission_code)
select r.id, x.permission_code
from public.roles r
cross join (values ('traceability.read'),('traceability.operate')) as x(permission_code)
where r.code in ('operator','field_operator')
on conflict do nothing;

-- Read-oriented stakeholders can inspect traceability where already scoped.
insert into public.role_permissions (role_id, permission_code)
select r.id, 'traceability.read'
from public.roles r
where r.code in ('finance','executive_viewer','public_manager','contract_manager')
on conflict do nothing;

-- Replace the M0 organization-only read policy with the M1 permission model.
drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select on public.audit_events
for select to authenticated
using (
  organization_id is not null
  and (
    app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'audit.read')
    or app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'audit.review')
    or app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'audit.manage')
  )
);

comment on column public.audit_events.correlation_id is
  'Groups events belonging to the same business operation without hiding the relationship in technical_context.';
comment on column public.audit_events.causation_event_id is
  'Optional immutable link to the event that directly caused this event.';
comment on column public.audit_events.justification is
  'Human-readable justification for corrections/reviews when required by the domain command.';
comment on column public.audit_events.unit_id is
  'Optional operational unit scope; null when the audited subject is organization-scoped.';
