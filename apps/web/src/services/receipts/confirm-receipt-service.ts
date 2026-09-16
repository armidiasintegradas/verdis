import type { ReceiptDecision } from '@/domain/receipt-flow'
import { supabase } from '@/lib/supabase/client'

export type ConfirmReceiptInput = {
  movementId: string
  decision: ReceiptDecision
  evidenceId: string | null
  reason: string | null
}

export type ConfirmReceiptResult = {
  movementId: string
  adoptedQuantityKg: number
  previousStockKg: number
  newStockKg: number
}

export async function confirmReceipt(
  input: ConfirmReceiptInput,
): Promise<ConfirmReceiptResult> {
  const { data, error } = await supabase.rpc('confirm_receipt_m1', {
    p_movement_id: input.movementId,
    p_decision: input.decision,
    p_evidence_id: input.evidenceId as string,
    p_reason: input.reason as string,
  })

  if (error) throw error

  const row = data?.[0]
  if (!row) {
    throw new Error('Receipt confirmation returned no result')
  }

  return {
    movementId: row.movement_id,
    adoptedQuantityKg: Number(row.adopted_quantity_kg),
    previousStockKg: Number(row.previous_stock_kg),
    newStockKg: Number(row.new_stock_kg),
  }
}
