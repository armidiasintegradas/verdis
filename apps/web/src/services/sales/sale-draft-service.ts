import type { ActiveScope } from '@/domain/scope'
import { supabase } from '@/lib/supabase/client'

export type SaleDraftInput = {
  buyerCounterpartyId: string
  materialId: string
  quantityKg: number
  unitPrice: number
  soldAt: string
}

export type SaleDraftRecord = {
  movementId: string
  saleId: string
  status: 'draft' | 'posted' | 'voided'
  buyerCounterpartyId: string
  materialId: string
  quantityKg: number
  unitPrice: number
  totalAmount: number
  soldAt: string
  availableStockKg: number
}

type SaleDraftRpcRow = {
  movement_id: string
  sale_id: string
  total_amount: number
}

function applyScopeFilters<T extends {
  eq: (column: string, value: string) => T
  is: (column: string, value: null) => T
}>(query: T, scope: ActiveScope) {
  let scoped = query
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
  scoped = scope.unitId === null ? scoped.is('unit_id', null) : scoped.eq('unit_id', scope.unitId)
  return scoped
}

async function callDraftRpc(
  name: 'create_sale_draft_m1' | 'update_sale_draft_m1',
  args: Record<string, string | number | null>,
): Promise<SaleDraftRpcRow> {
  const rpc = supabase.rpc as unknown as (
    functionName: string,
    params: Record<string, string | number | null>,
  ) => Promise<{ data: SaleDraftRpcRow[] | null; error: Error | null }>

  const { data, error } = await rpc(name, args)
  const row = data?.[0]
  if (error || !row) throw error ?? new Error('Sale draft operation failed')
  return row
}

export async function createSaleDraft(scope: ActiveScope, input: SaleDraftInput) {
  const row = await callDraftRpc('create_sale_draft_m1', {
    p_buyer_counterparty_id: input.buyerCounterpartyId,
    p_material_id: input.materialId,
    p_quantity_kg: input.quantityKg,
    p_unit_price: input.unitPrice,
    p_sold_at: input.soldAt,
    p_organization_id: scope.organizationId,
    p_unit_id: scope.unitId,
  })

  return {
    movementId: row.movement_id,
    saleId: row.sale_id,
    totalAmount: Number(row.total_amount),
  }
}

export async function updateSaleDraft(
  movementId: string,
  _scope: ActiveScope,
  input: SaleDraftInput,
) {
  const row = await callDraftRpc('update_sale_draft_m1', {
    p_movement_id: movementId,
    p_buyer_counterparty_id: input.buyerCounterpartyId,
    p_material_id: input.materialId,
    p_quantity_kg: input.quantityKg,
    p_unit_price: input.unitPrice,
    p_sold_at: input.soldAt,
  })

  return {
    movementId: row.movement_id,
    saleId: row.sale_id,
    totalAmount: Number(row.total_amount),
  }
}

export async function getSaleDraft(
  movementId: string,
  scope: ActiveScope,
): Promise<SaleDraftRecord> {
  const movementQuery = supabase
    .from('movements')
    .select('id, material_id, quantity_kg, occurred_at, status')
    .eq('id', movementId)
    .eq('movement_type', 'sale')
  const scopedMovement = applyScopeFilters(movementQuery, scope)
  const { data: movement, error: movementError } = await scopedMovement.single()
  if (!movement) throw new Error('Sale draft not found')
  if (movementError) throw movementError

  const saleQuery = supabase
    .from('sales')
    .select('id, buyer_counterparty_id, material_id, quantity_kg, unit_price, total_amount, sold_at')
    .eq('movement_id', movementId)
  const scopedSale = applyScopeFilters(saleQuery, scope)
  const { data: sale, error: saleError } = await scopedSale.single()
  if (!sale) throw new Error('Sale draft not found')
  if (saleError) throw saleError

  let stockQuery = supabase
    .from('current_stock')
    .select('quantity_kg')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
    .eq('material_id', movement.material_id)
  stockQuery = scope.unitId === null ? stockQuery.is('unit_id', null) : stockQuery.eq('unit_id', scope.unitId)
  const { data: stock, error: stockError } = await stockQuery.maybeSingle()
  if (stockError) throw stockError

  return {
    movementId: movement.id,
    saleId: sale.id,
    status: movement.status,
    buyerCounterpartyId: sale.buyer_counterparty_id,
    materialId: sale.material_id,
    quantityKg: Number(sale.quantity_kg),
    unitPrice: Number(sale.unit_price),
    totalAmount: Number(sale.total_amount ?? 0),
    soldAt: sale.sold_at,
    availableStockKg: Number(stock?.quantity_kg ?? 0),
  }
}
