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

  select m.* into v_movement
  from public.movements m
  where m.id = p_movement_id
  for update;
  if v_movement.id is null then raise exception 'sale not found'; end if;
  if v_movement.movement_type <> 'sale' then raise exception 'movement is not a sale'; end if;
  if v_movement.status <> 'draft' then raise exception 'sale is not draft'; end if;

  select s.* into v_sale
  from public.sales s
  where s.movement_id = p_movement_id
  for update;
  if v_sale.id is null then raise exception 'sale record not found'; end if;

  if not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'sale.create')
     or not app_private.has_permission(v_user_id, v_movement.tenant_id, v_movement.organization_id, v_movement.unit_id, 'movement.create') then
    raise exception 'sale draft update is not authorized';
  end if;

  select c.tenant_id, c.organization_id into v_buyer_tenant, v_buyer_org
  from public.counterparties c
  where c.id = p_buyer_counterparty_id;
  if v_buyer_tenant is null or v_buyer_tenant <> v_movement.tenant_id or v_buyer_org <> v_movement.organization_id then
    raise exception 'buyer counterparty must belong to seller organization and tenant';
  end if;

  select m.tenant_id into v_material_tenant
  from public.materials m
  where m.id = p_material_id;
  if v_material_tenant is null or v_material_tenant <> v_movement.tenant_id then
    raise exception 'sale material must belong to sale tenant';
  end if;

  if p_quantity_kg is null or p_quantity_kg <= 0 then raise exception 'sale quantity must be greater than zero'; end if;
  if p_unit_price is null or p_unit_price < 0 then raise exception 'sale unit price must be nonnegative'; end if;
  if p_sold_at is null then raise exception 'sale date is required'; end if;

  update public.movements m
  set material_id = p_material_id,
      quantity_kg = p_quantity_kg,
      destination_counterparty_id = p_buyer_counterparty_id,
      occurred_at = p_sold_at
  where m.id = p_movement_id;

  update public.sales s
  set buyer_counterparty_id = p_buyer_counterparty_id,
      material_id = p_material_id,
      quantity_kg = p_quantity_kg,
      unit_price = p_unit_price,
      sold_at = p_sold_at
  where s.id = v_sale.id
  returning s.total_amount into v_total;

  return query select p_movement_id, v_sale.id, v_total;
end;
$$;

revoke all on function public.update_sale_draft_m1(uuid,uuid,uuid,numeric,numeric,timestamptz) from public, anon;
grant execute on function public.update_sale_draft_m1(uuid,uuid,uuid,numeric,numeric,timestamptz) to authenticated;

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

  select m.* into v_movement
  from public.movements m
  where m.id = p_movement_id
  for update;
  if v_movement.id is null then raise exception 'sale not found'; end if;
  if v_movement.movement_type <> 'sale' then raise exception 'movement is not a sale'; end if;
  if v_movement.status <> 'draft' then raise exception 'sale is not draft'; end if;

  select s.* into v_sale
  from public.sales s
  where s.movement_id = p_movement_id
  for update;
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
      update public.sales s
      set unit_price = v_document_unit_price
      where s.id = v_sale.id;
      v_sale.unit_price := v_document_unit_price;
    end if;
  end if;

  update public.movements m
  set status = 'posted'
  where m.id = p_movement_id;

  select s.unit_price, s.total_amount into v_final_price, v_final_total
  from public.sales s
  where s.id = v_sale.id;

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
