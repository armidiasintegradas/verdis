-- Verdis M1 — operational audit exceptions with segregation of duties.

create table public.audit_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  subject_type text not null,
  subject_id uuid not null,
  source_event_id uuid references public.audit_events(id) on delete restrict,
  state text not null default 'open' check (state in ('open','in_review','resolved','rejected','escalated')),
  resolution_result text check (resolution_result is null or resolution_result in ('confirmed','corrected','justified','rejected','escalated')),
  assigned_to_user_id uuid references auth.users(id) on delete restrict,
  opened_by_user_id uuid not null references auth.users(id) on delete restrict,
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_justification text,
  corrective_event_id uuid references public.audit_events(id) on delete restrict
);
create index audit_exceptions_scope_state_idx on public.audit_exceptions(tenant_id,organization_id,unit_id,state,opened_at desc);
create index audit_exceptions_assignee_idx on public.audit_exceptions(assigned_to_user_id,state,opened_at desc) where assigned_to_user_id is not null;

alter table public.audit_exceptions enable row level security;
create policy audit_exceptions_select on public.audit_exceptions for select to authenticated using (
  app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'audit.read') or
  app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'audit.review') or
  app_private.has_permission(auth.uid(),tenant_id,organization_id,unit_id,'audit.manage')
);

create or replace function public.open_audit_exception(p_tenant_id uuid,p_organization_id uuid,p_unit_id uuid,p_subject_type text,p_subject_id uuid,p_source_event_id uuid,p_justification text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=gen_random_uuid(); v_actor uuid:=auth.uid(); v_corr uuid:=gen_random_uuid(); v_source public.audit_events%rowtype;
begin
  if v_actor is null then raise exception 'authenticated user is required'; end if;
  if not (app_private.has_permission(v_actor,p_tenant_id,p_organization_id,p_unit_id,'audit.review') or app_private.has_permission(v_actor,p_tenant_id,p_organization_id,p_unit_id,'audit.manage')) then raise exception 'permission denied'; end if;
  if nullif(btrim(coalesce(p_subject_type,'')),'') is null or nullif(btrim(coalesce(p_justification,'')),'') is null then raise exception 'subject type and justification are required'; end if;
  if p_source_event_id is not null then select * into v_source from public.audit_events where id=p_source_event_id; if v_source.id is null or v_source.tenant_id<>p_tenant_id or v_source.organization_id is distinct from p_organization_id or v_source.unit_id is distinct from p_unit_id then raise exception 'source event scope mismatch'; end if; end if;
  insert into public.audit_exceptions(id,tenant_id,organization_id,unit_id,subject_type,subject_id,source_event_id,opened_by_user_id) values(v_id,p_tenant_id,p_organization_id,p_unit_id,p_subject_type,p_subject_id,p_source_event_id,v_actor);
  insert into public.audit_events(tenant_id,organization_id,unit_id,actor_user_id,action,subject_type,subject_id,correlation_id,causation_event_id,justification,new_state) values(p_tenant_id,p_organization_id,p_unit_id,v_actor,'exception.opened','audit_exception',v_id,v_corr,p_source_event_id,p_justification,jsonb_build_object('state','open','subject_type',p_subject_type,'subject_id',p_subject_id));
  return v_id;
end $$;

create or replace function public.claim_audit_exception(p_exception_id uuid,p_justification text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.audit_exceptions%rowtype; v_actor uuid:=auth.uid(); v_corr uuid:=gen_random_uuid();
begin
  select * into e from public.audit_exceptions where id=p_exception_id for update;
  if e.id is null then raise exception 'audit exception not found'; end if;
  if not (app_private.has_permission(v_actor,e.tenant_id,e.organization_id,e.unit_id,'audit.review') or app_private.has_permission(v_actor,e.tenant_id,e.organization_id,e.unit_id,'audit.manage')) then raise exception 'permission denied'; end if;
  if e.state<>'open' or e.assigned_to_user_id is not null then raise exception 'audit exception is not claimable'; end if;
  update public.audit_exceptions set assigned_to_user_id=v_actor,state='in_review',updated_at=now() where id=e.id;
  insert into public.audit_events(tenant_id,organization_id,unit_id,actor_user_id,action,subject_type,subject_id,correlation_id,justification,previous_state,new_state) values(e.tenant_id,e.organization_id,e.unit_id,v_actor,'exception.assigned','audit_exception',e.id,v_corr,p_justification,jsonb_build_object('state',e.state,'assignee',e.assigned_to_user_id),jsonb_build_object('state','in_review','assignee',v_actor));
end $$;

create or replace function public.reassign_audit_exception(p_exception_id uuid,p_assignee_user_id uuid,p_justification text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.audit_exceptions%rowtype; v_actor uuid:=auth.uid(); v_corr uuid:=gen_random_uuid();
begin
  select * into e from public.audit_exceptions where id=p_exception_id for update;
  if e.id is null then raise exception 'audit exception not found'; end if;
  if not (app_private.has_permission(v_actor,e.tenant_id,e.organization_id,e.unit_id,'audit.assign') or app_private.has_permission(v_actor,e.tenant_id,e.organization_id,e.unit_id,'audit.manage')) then raise exception 'permission denied'; end if;
  if e.state not in ('open','in_review','escalated') then raise exception 'audit exception cannot be reassigned'; end if;
  if p_assignee_user_id is null or nullif(btrim(coalesce(p_justification,'')),'') is null then raise exception 'assignee and justification are required'; end if;
  if not (app_private.has_permission(p_assignee_user_id,e.tenant_id,e.organization_id,e.unit_id,'audit.review') or app_private.has_permission(p_assignee_user_id,e.tenant_id,e.organization_id,e.unit_id,'audit.manage')) then raise exception 'assignee is not authorized for scope'; end if;
  update public.audit_exceptions set assigned_to_user_id=p_assignee_user_id,state='in_review',updated_at=now() where id=e.id;
  insert into public.audit_events(tenant_id,organization_id,unit_id,actor_user_id,action,subject_type,subject_id,correlation_id,justification,previous_state,new_state) values(e.tenant_id,e.organization_id,e.unit_id,v_actor,'exception.reassigned','audit_exception',e.id,v_corr,p_justification,jsonb_build_object('state',e.state,'assignee',e.assigned_to_user_id),jsonb_build_object('state','in_review','assignee',p_assignee_user_id));
end $$;

create or replace function public.resolve_audit_exception(p_exception_id uuid,p_result text,p_justification text,p_corrective_event_id uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.audit_exceptions%rowtype; src public.audit_events%rowtype; corr public.audit_events%rowtype; v_actor uuid:=auth.uid(); v_state text; v_action text; v_corr uuid:=gen_random_uuid();
begin
  select * into e from public.audit_exceptions where id=p_exception_id for update;
  if e.id is null then raise exception 'audit exception not found'; end if;
  if not (app_private.has_permission(v_actor,e.tenant_id,e.organization_id,e.unit_id,'audit.resolve') or app_private.has_permission(v_actor,e.tenant_id,e.organization_id,e.unit_id,'audit.manage')) then raise exception 'permission denied'; end if;
  if e.state not in ('open','in_review','escalated') then raise exception 'audit exception is already closed'; end if;
  if p_result not in ('confirmed','corrected','justified','rejected','escalated') then raise exception 'invalid resolution result'; end if;
  if nullif(btrim(coalesce(p_justification,'')),'') is null then raise exception 'resolution justification is required'; end if;
  if e.source_event_id is not null then select * into src from public.audit_events where id=e.source_event_id; if src.actor_user_id=v_actor then raise exception 'segregation of duties: author cannot validate own critical action'; end if; end if;
  if p_result='corrected' then
    if p_corrective_event_id is null then raise exception 'corrected resolution requires corrective event'; end if;
    select * into corr from public.audit_events where id=p_corrective_event_id;
    if corr.id is null or corr.tenant_id<>e.tenant_id or corr.organization_id is distinct from e.organization_id or corr.unit_id is distinct from e.unit_id then raise exception 'corrective event scope mismatch'; end if;
    if corr.actor_user_id=v_actor then raise exception 'segregation of duties: corrector cannot validate own critical action'; end if;
  elsif p_corrective_event_id is not null then raise exception 'corrective event is only valid for corrected result'; end if;
  v_state:=case when p_result='rejected' then 'rejected' when p_result='escalated' then 'escalated' else 'resolved' end;
  v_action:=case when p_result='rejected' then 'exception.rejected' when p_result='escalated' then 'exception.escalated' else 'exception.resolved' end;
  update public.audit_exceptions set state=v_state,resolution_result=p_result,resolution_justification=p_justification,corrective_event_id=p_corrective_event_id,updated_at=now(),resolved_at=case when v_state in ('resolved','rejected') then now() else null end where id=e.id;
  insert into public.audit_events(tenant_id,organization_id,unit_id,actor_user_id,action,subject_type,subject_id,correlation_id,causation_event_id,justification,previous_state,new_state) values(e.tenant_id,e.organization_id,e.unit_id,v_actor,v_action,'audit_exception',e.id,v_corr,coalesce(p_corrective_event_id,e.source_event_id),p_justification,jsonb_build_object('state',e.state),jsonb_build_object('state',v_state,'result',p_result,'corrective_event_id',p_corrective_event_id));
end $$;

revoke all on function public.open_audit_exception(uuid,uuid,uuid,text,uuid,uuid,text) from public,anon;
revoke all on function public.claim_audit_exception(uuid,text) from public,anon;
revoke all on function public.reassign_audit_exception(uuid,uuid,text) from public,anon;
revoke all on function public.resolve_audit_exception(uuid,text,text,uuid) from public,anon;
grant execute on function public.open_audit_exception(uuid,uuid,uuid,text,uuid,uuid,text) to authenticated;
grant execute on function public.claim_audit_exception(uuid,text) to authenticated;
grant execute on function public.reassign_audit_exception(uuid,uuid,text) to authenticated;
grant execute on function public.resolve_audit_exception(uuid,text,text,uuid) to authenticated;
