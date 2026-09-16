create or replace function public.create_sale_draft_m1(
  p_buyer_counterparty_id uuid,
  p_material_id uuid,
  p_quantity_kg numeric,
  p_unit_price numeric,
  p_sold_at timestamptz,
  p_organization_id uuid,
  p_unit_id uuid default null
)
returns table(movement_id uuid, sale_id uuid, total_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_unit_org uuid;
  v_buyer_tenant uuid;
  v_buyer_org uuid;
  v_material_tenant uuid;
  v_movement_id uuid;
  v_sale_id uuid;
  v_total numeric;
begin
  if v_user_id is null then
    raise exception 'authenticated user is required';
  end if;

  select tenant_id into v_tenant_id
  from public.organizations
  where id = p_organization_id;

  if v_tenant_id is null then
    raise exception 'sale organization not found';
  end if;

  if p_unit_id is not null then
    select organization_id into v_unit_org from public.units where id = p_unit_id;
    if v_unit_org is null or v_unit_org <> p_organization_id then
      raise exception 'sale unit must belong to sale organization';
    end if;
  end if;

  if not app_private.has_permission(v_user_id, v_tenant_id, p_organization_id, p_unit_id, 'sale.create')
     or not app_private.has_permission(v_user_id, v_tenant_id, p_organization_id, p_unit_id, 'movement.create') then
    raise exception 'sale draft creation is not authorized';
  end if;

  select tenant_id, organization_id into v_buyer_tenant, v_buyer_org
  from public.counterparties where id = p_buyer_counterparty_id;
  if v_buyer_tenant is null or v_buyer_tenant <> v_tenant_id or v_buyer_org <> p_organization_id then
    raise exception 'buyer counterparty must belong to seller organization and tenant';
  end if;

  select tenant_id into v_material_tenant from public.materials where id = p_material_id;
  if v_material_tenant is null or v_material_tenant <> v_tenant_id then
    raise exception 'sale material must belong to sale tenant';
  end if;

  if p_quantity_kg is null or p_quantity_kg <= 0 then
    raise exception 'sale quantity must be greater than zero';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'sale unit price must be nonnegative';
  end if;
  if p_sold_at is null then
    raise exception 'sale date is required';
  end if;

  insert into public.movements (
    tenant_id, organization_id, unit_id, movement_type, material_id,
    quantity_kg, destination_counterparty_id, occurred_at, created_by, status
  ) values (
    v_tenant_id, p_organization_id, p_unit_id, 'sale', p_material_id,
    p_quantity_kg, p_buyer_counterparty_id, p_sold_at, v_user_id, 'draft'
  ) returning id into v_movement_id;

  insert into public.sales (
    tenant_id, organization_id, unit_id, movement_id,
    buyer_counterparty_id, material_id, quantity_kg, unit_price, sold_at
  ) values (
    v_tenant_id, p_organization_id, p_unit_id, v_movement_id,
    p_buyer_counterparty_id, p_material_id, p_quantity_kg, p_unit_price, p_sold_at
  ) returning id, sales.total_amount into v_sale_id, v_total;

  return query select v_movement_id, v_sale_id, v_total;
end;
$$;

revoke all on function public.create_sale_draft_m1(uuid,uuid,numeric,numeric,timestamptz,uuid,uuid) from public, anon;
grant execute on function public.create_sale_draft_m1(uuid,uuid,numeric,numeric,timestamptz,uuid,uuid) to authenticated;

create or replace function public.update_sale_draft_m1(
  p_movement_id uuid,
  p_buyer_counterparty_id uuid,
  p_material_id uuid,
  p_quantity_kg numeric,
  p_unit_price numeric,
  p_sold_at timestamptz
)
returns table(movement_id uuid, sale_id uuid, total_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.movements;
  v_sale public.sales;
  v_buyer_tenant uuid;
  v_buyer_org uuid;
  v_material_tenant uuid;
  v_total numeric;
begin
  if v_user_id is null then
    raise exception 'authenticated user is required';
  end if;

  select * into v_movement from public.movements where id = p_movement_id for update;
  if v_movement.id is null then raise exception 'sale not found'; end if;
  if v_movement.movement_type <> 'sale' then raise exception 'movement is not a sale'; end if;
  if v_movement.status <> 'draft' then raise exception 'sale is not draft'; end if;

  select * into v_sale from public.sales where movement_id = p_movement_id for update;
  if v_sale.id is null then raise exception 'sale record not found'; end if;

  if not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'sale.create')
     or not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'movement.create') then
    raise exception 'sale draft update is not authorized';
  end if;

  select tenant_id, organization_id into v_buyer_tenant, v_buyer_org
  from public.counterparties where id = p_buyer_counterparty_id;
  if v_buyer_tenant is null or v_buyer_tenant <> v_movement.tenant_id or v_buyer_org <> v_movement.organization_id then
    raise exception 'buyer counterparty must belong to seller organization and tenant';
  end if;

  select tenant_id into v_material_tenant from public.materials where id = p_material_id;
  if v_material_tenant is null or v_material_tenant <> v_movement.tenant_id then
    raise exception 'sale material must belong to sale tenant';
  end if;

  if p_quantity_kg is null or p_quantity_kg <= 0 then raise exception 'sale quantity must be greater than zero'; end if;
  if p_unit_price is null or p_unit_price < 0 then raise exception 'sale unit price must be nonnegative'; end if;
  if p_sold_at is null then raise exception 'sale date is required'; end if;

  update public.movements
  set material_id = p_material_id,
      quantity_kg = p_quantity_kg,
      destination_counterparty_id = p_buyer_counterparty_id,
      occurred_at = p_sold_at
  where id = p_movement_id;

  update public.sales
  set buyer_counterparty_id = p_buyer_counterparty_id,
      material_id = p_material_id,
      quantity_kg = p_quantity_kg,
      unit_price = p_unit_price,
      sold_at = p_sold_at
  where id = v_sale.id
  returning sales.total_amount into v_total;

  return query select p_movement_id, v_sale.id, v_total;
end;
$$;

revoke all on function public.update_sale_draft_m1(uuid,uuid,uuid,numeric,numeric,timestamptz) from public, anon;
grant execute on function public.update_sale_draft_m1(uuid,uuid,uuid,numeric,numeric,timestamptz) to authenticated;

create or replace function public.register_sale_evidence_document(
  p_movement_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_sha256 text,
  p_storage_path text,
  p_claimed_quantity_kg numeric,
  p_claimed_unit_price numeric
)
returns table(document_id uuid, evidence_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.movements;
  v_sale public.sales;
  v_document_id uuid;
  v_evidence_id uuid;
  v_expected_prefix text;
  v_claimed_total numeric;
begin
  if v_user_id is null then raise exception 'authenticated user is required'; end if;

  select * into v_movement from public.movements where id = p_movement_id for update;
  if v_movement.id is null then raise exception 'sale not found'; end if;
  if v_movement.movement_type <> 'sale' then raise exception 'movement is not a sale'; end if;
  if v_movement.status <> 'draft' then raise exception 'sale is not draft'; end if;

  select * into v_sale from public.sales where movement_id = p_movement_id for update;
  if v_sale.id is null then raise exception 'sale record not found'; end if;

  if not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'movement.read')
     or not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'evidence.upload') then
    raise exception 'sale evidence registration is not authorized';
  end if;

  if p_original_filename is null or btrim(p_original_filename) = '' then raise exception 'original filename is required'; end if;
  if p_mime_type is null or btrim(p_mime_type) = '' then raise exception 'mime type is required'; end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'valid sha256 is required'; end if;
  if p_claimed_quantity_kg is null or p_claimed_quantity_kg <= 0 then raise exception 'claimed quantity must be greater than zero'; end if;
  if p_claimed_unit_price is null or p_claimed_unit_price < 0 then raise exception 'claimed unit price must be nonnegative'; end if;
  if p_claimed_quantity_kg is distinct from v_sale.quantity_kg or p_claimed_unit_price is distinct from v_sale.unit_price then
    raise exception 'claimed sale values must match the current draft';
  end if;

  v_expected_prefix := v_movement.tenant_id::text || '/' || v_movement.organization_id::text || '/';
  if p_storage_path is null or p_storage_path not like v_expected_prefix || '%' then
    raise exception 'storage path does not match sale scope';
  end if;

  v_claimed_total := round(p_claimed_quantity_kg * p_claimed_unit_price, 2);

  insert into public.documents (
    tenant_id, organization_id, uploaded_by, document_type,
    original_filename, mime_type, sha256, storage_bucket, storage_path, extraction_status
  ) values (
    v_movement.tenant_id, v_movement.organization_id, v_user_id, 'sale_evidence',
    p_original_filename, p_mime_type, p_sha256, 'evidence-documents', p_storage_path, 'pending'
  ) returning id into v_document_id;

  insert into public.evidences (
    movement_id, document_id, evidence_type, claimed_fields, extracted_fields, status, created_by
  ) values (
    p_movement_id, v_document_id, 'sale_document',
    jsonb_build_object(
      'quantity_kg', p_claimed_quantity_kg,
      'unit_price', p_claimed_unit_price,
      'total_amount', v_claimed_total
    ),
    '{}'::jsonb, 'pending', v_user_id
  ) returning id into v_evidence_id;

  update public.sales set fiscal_document_id = v_document_id where id = v_sale.id;

  return query select v_document_id, v_evidence_id;
end;
$$;

revoke all on function public.register_sale_evidence_document(uuid,text,text,text,text,numeric,numeric) from public, anon;
grant execute on function public.register_sale_evidence_document(uuid,text,text,text,text,numeric,numeric) to authenticated;

create or replace function public.confirm_sale_m1(
  p_movement_id uuid,
  p_decision text,
  p_evidence_id uuid default null,
  p_reason text default null
)
returns table(
  movement_id uuid,
  sale_id uuid,
  adopted_quantity_kg numeric,
  adopted_unit_price numeric,
  adopted_total_amount numeric,
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
  v_sale public.sales;
  v_evidence public.evidences;
  v_extracted jsonb;
  v_document_quantity numeric;
  v_document_unit_price numeric;
  v_document_total numeric;
  v_previous_stock numeric;
  v_new_stock numeric;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_final_price numeric;
  v_final_total numeric;
begin
  if v_user_id is null then raise exception 'authenticated user is required'; end if;

  select * into v_movement from public.movements where id = p_movement_id for update;
  if v_movement.id is null then raise exception 'sale not found'; end if;
  if v_movement.movement_type <> 'sale' then raise exception 'movement is not a sale'; end if;
  if v_movement.status <> 'draft' then raise exception 'sale is not draft'; end if;

  select * into v_sale from public.sales where movement_id = p_movement_id for update;
  if v_sale.id is null then raise exception 'sale record not found'; end if;

  if not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'sale.create') then
    raise exception 'sale confirmation is not authorized';
  end if;

  if p_decision not in ('registered_only','use_document','keep_registered') then
    raise exception 'invalid sale decision';
  end if;

  v_previous_stock := app_private.current_stock_quantity(
    v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, v_movement.material_id
  );
  if v_previous_stock < v_movement.quantity_kg then
    raise exception 'insufficient stock for sale';
  end if;

  if p_decision = 'registered_only' then
    if p_evidence_id is not null then raise exception 'registered_only must not include evidence'; end if;
  else
    if p_evidence_id is null then raise exception 'sale evidence is required'; end if;

    select e.* into v_evidence
    from public.evidences e
    where e.id = p_evidence_id and e.movement_id = p_movement_id
    for share;
    if v_evidence.id is null then raise exception 'sale evidence not found'; end if;
    if v_evidence.document_id is null then raise exception 'sale evidence document is required'; end if;

    select x.extracted_fields into v_extracted
    from public.document_extractions x
    where x.document_id = v_evidence.document_id
    order by x.created_at desc, x.id desc
    limit 1;
    if v_extracted is null then raise exception 'sale evidence has not been processed'; end if;

    begin
      v_document_quantity := nullif(v_extracted ->> 'quantity_kg','')::numeric;
      v_document_unit_price := nullif(v_extracted ->> 'unit_price','')::numeric;
      v_document_total := nullif(v_extracted ->> 'total_amount','')::numeric;
    exception when invalid_text_representation then
      raise exception 'processed sale evidence values are invalid';
    end;

    if v_document_quantity is null or v_document_quantity <= 0
       or v_document_unit_price is null or v_document_unit_price < 0 then
      raise exception 'processed sale evidence values are invalid';
    end if;

    if v_document_quantity is distinct from v_sale.quantity_kg then
      raise exception 'document quantity differs from sale quantity';
    end if;

    if v_document_total is not null
       and abs(v_document_total - round(v_document_quantity * v_document_unit_price, 2)) > 0.01 then
      raise exception 'processed sale evidence total is inconsistent';
    end if;

    if p_decision = 'keep_registered'
       and v_document_unit_price is distinct from v_sale.unit_price
       and v_reason is null then
      raise exception 'justification is required to keep the registered sale price';
    end if;

    insert into public.validations (
      movement_id, evidence_id, document_id, validation_type, status,
      automated, actor_user_id, rule_code, reason
    ) values (
      p_movement_id, v_evidence.id, v_evidence.document_id, 'operator_resolution', 'accepted',
      false, v_user_id,
      case p_decision
        when 'use_document' then 'SALE_USE_DOCUMENT_PRICE'
        else 'SALE_KEEP_REGISTERED_PRICE'
      end,
      v_reason
    );

    if p_decision = 'use_document' then
      update public.sales set unit_price = v_document_unit_price where id = v_sale.id;
      v_sale.unit_price := v_document_unit_price;
    end if;
  end if;

  update public.movements set status = 'posted' where id = p_movement_id;

  select unit_price, total_amount into v_final_price, v_final_total
  from public.sales where id = v_sale.id;

  v_new_stock := app_private.current_stock_quantity(
    v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, v_movement.material_id
  );

  return query select
    p_movement_id,
    v_sale.id,
    v_movement.quantity_kg,
    v_final_price,
    v_final_total,
    v_previous_stock,
    v_new_stock;
end;
$$;

revoke all on function public.confirm_sale_m1(uuid,text,uuid,text) from public, anon;
grant execute on function public.confirm_sale_m1(uuid,text,uuid,text) to authenticated;
