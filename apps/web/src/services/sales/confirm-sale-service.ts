import type { SaleDecision } from '@/domain/sale-flow'
import { supabase } from '@/lib/supabase/client'

export type ConfirmSaleInput = {
  movementId: string
  decision: SaleDecision
  evidenceId: string | null
  reason: string | null
}

export type ConfirmSaleResult = {
  movementId: string
  saleId: string
  adoptedQuantityKg: number
  adoptedUnitPrice: number
  adoptedTotalAmount: number
  previousStockKg: number
  newStockKg: number
}

type ConfirmSaleRpcRow = {
  movement_id: string
  sale_id: string
  adopted_quantity_kg: number | string
  adopted_unit_price: number | string
  adopted_total_amount: number | string
  previous_stock_kg: number | string
  new_stock_kg: number | string
}

export async function confirmSale(input: ConfirmSaleInput): Promise<ConfirmSaleResult> {
  const rpc = supabase.rpc as unknown as (
    functionName: string,
    params: Record<string, string | null>,
  ) => Promise<{ data: ConfirmSaleRpcRow[] | null; error: Error | null }>

  const { data, error } = await rpc('confirm_sale_m1', {
    p_movement_id: input.movementId,
    p_decision: input.decision,
    p_evidence_id: input.evidenceId,
    p_reason: input.reason,
  })

  const row = data?.[0]
  if (error || !row) throw error ?? new Error('Sale confirmation failed')

  return {
    movementId: row.movement_id,
    saleId: row.sale_id,
    adoptedQuantityKg: Number(row.adopted_quantity_kg),
    adoptedUnitPrice: Number(row.adopted_unit_price),
    adoptedTotalAmount: Number(row.adopted_total_amount),
    previousStockKg: Number(row.previous_stock_kg),
    newStockKg: Number(row.new_stock_kg),
  }
}
