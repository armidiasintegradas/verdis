create or replace function public.register_receipt_evidence_document(
  p_movement_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_sha256 text,
  p_storage_path text,
  p_claimed_quantity_kg numeric
)
returns table(document_id uuid, evidence_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.movements;
  v_document_id uuid;
  v_evidence_id uuid;
  v_expected_prefix text;
begin
  if v_user_id is null then
    raise exception 'authenticated user is required';
  end if;

  select * into v_movement
  from public.movements
  where id = p_movement_id
  for update;

  if v_movement.id is null then
    raise exception 'receipt not found';
  end if;

  if v_movement.movement_type <> 'receipt' then
    raise exception 'movement is not a receipt';
  end if;

  if v_movement.status <> 'draft' then
    raise exception 'receipt is not draft';
  end if;

  if not app_private.has_permission(
    v_user_id,
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    'movement.read'
  ) or not app_private.has_permission(
    v_user_id,
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    'evidence.upload'
  ) then
    raise exception 'receipt evidence registration is not authorized';
  end if;

  if p_original_filename is null or btrim(p_original_filename) = '' then
    raise exception 'original filename is required';
  end if;

  if p_mime_type is null or btrim(p_mime_type) = '' then
    raise exception 'mime type is required';
  end if;

  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'valid sha256 is required';
  end if;

  if p_claimed_quantity_kg is null or p_claimed_quantity_kg <= 0 then
    raise exception 'claimed quantity must be greater than zero';
  end if;

  v_expected_prefix := v_movement.tenant_id::text || '/' || v_movement.organization_id::text || '/';
  if p_storage_path is null or p_storage_path not like v_expected_prefix || '%' then
    raise exception 'storage path does not match receipt scope';
  end if;

  insert into public.documents (
    tenant_id,
    organization_id,
    uploaded_by,
    document_type,
    original_filename,
    mime_type,
    sha256,
    storage_bucket,
    storage_path,
    extraction_status
  ) values (
    v_movement.tenant_id,
    v_movement.organization_id,
    v_user_id,
    'receipt_evidence',
    p_original_filename,
    p_mime_type,
    p_sha256,
    'evidence-documents',
    p_storage_path,
    'pending'
  )
  returning id into v_document_id;

  insert into public.evidences (
    movement_id,
    document_id,
    evidence_type,
    claimed_fields,
    extracted_fields,
    status,
    created_by
  ) values (
    p_movement_id,
    v_document_id,
    'receipt_document',
    jsonb_build_object('quantity_kg', p_claimed_quantity_kg),
    '{}'::jsonb,
    'pending',
    v_user_id
  )
  returning id into v_evidence_id;

  return query select v_document_id, v_evidence_id;
end;
$$;

revoke all on function public.register_receipt_evidence_document(uuid,text,text,text,text,numeric) from public, anon;
grant execute on function public.register_receipt_evidence_document(uuid,text,text,text,text,numeric) to authenticated;

create or replace function public.confirm_receipt_m1(
  p_movement_id uuid,
  p_decision text,
  p_evidence_id uuid default null,
  p_reason text default null
)
returns table(
  movement_id uuid,
  adopted_quantity_kg numeric,
  previous_stock_kg numeric,
  new_stock_kg numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.movements;
  v_evidence public.evidences;
  v_document_quantity numeric;
  v_previous_stock numeric;
  v_new_stock numeric;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_user_id is null then
    raise exception 'authenticated user is required';
  end if;

  select * into v_movement
  from public.movements
  where id = p_movement_id
  for update;

  if v_movement.id is null then
    raise exception 'receipt not found';
  end if;

  if v_movement.movement_type <> 'receipt' then
    raise exception 'movement is not a receipt';
  end if;

  if v_movement.status <> 'draft' then
    raise exception 'receipt is not draft';
  end if;

  if not app_private.has_permission(
    v_user_id,
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    'movement.create'
  ) then
    raise exception 'receipt confirmation is not authorized';
  end if;

  if p_decision not in ('registered_only', 'use_document', 'keep_registered') then
    raise exception 'invalid receipt decision';
  end if;

  if p_decision = 'registered_only' then
    if p_evidence_id is not null then
      raise exception 'registered_only must not include evidence';
    end if;
  else
    if p_evidence_id is null then
      raise exception 'receipt evidence is required';
    end if;

    select e.* into v_evidence
    from public.evidences e
    where e.id = p_evidence_id
      and e.movement_id = p_movement_id
    for share;

    if v_evidence.id is null then
      raise exception 'receipt evidence not found';
    end if;

    if v_evidence.document_id is null then
      raise exception 'receipt evidence document is required';
    end if;

    if not exists (
      select 1
      from public.document_extractions x
      where x.document_id = v_evidence.document_id
    ) then
      raise exception 'receipt evidence has not been processed';
    end if;

    begin
      v_document_quantity := (v_evidence.extracted_fields ->> 'quantity_kg')::numeric;
    exception when invalid_text_representation then
      raise exception 'processed receipt evidence quantity is invalid';
    end;

    if v_document_quantity is null or v_document_quantity <= 0 then
      raise exception 'processed receipt evidence quantity is invalid';
    end if;

    if p_decision = 'keep_registered'
       and v_document_quantity is distinct from v_movement.quantity_kg
       and v_reason is null then
      raise exception 'justification is required to keep the registered quantity';
    end if;
  end if;

  v_previous_stock := app_private.current_stock_quantity(
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    v_movement.material_id
  );

  if p_decision in ('use_document', 'keep_registered') then
    insert into public.validations (
      movement_id,
      evidence_id,
      document_id,
      validation_type,
      status,
      automated,
      actor_user_id,
      rule_code,
      reason
    ) values (
      p_movement_id,
      v_evidence.id,
      v_evidence.document_id,
      'operator_resolution',
      'accepted',
      false,
      v_user_id,
      case p_decision
        when 'use_document' then 'RECEIPT_USE_DOCUMENT_QUANTITY'
        else 'RECEIPT_KEEP_REGISTERED_QUANTITY'
      end,
      v_reason
    );
  end if;

  if p_decision = 'use_document' then
    update public.movements
    set quantity_kg = v_document_quantity,
        status = 'posted'
    where id = p_movement_id;
    v_movement.quantity_kg := v_document_quantity;
  else
    update public.movements
    set status = 'posted'
    where id = p_movement_id;
  end if;

  v_new_stock := app_private.current_stock_quantity(
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    v_movement.material_id
  );

  return query
  select p_movement_id, v_movement.quantity_kg, v_previous_stock, v_new_stock;
end;
$$;

revoke all on function public.confirm_receipt_m1(uuid,text,uuid,text) from public, anon;
grant execute on function public.confirm_receipt_m1(uuid,text,uuid,text) to authenticated;
