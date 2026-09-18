import type { ActiveScope } from '@/domain/scope'
import type { SaleDecision } from '@/domain/sale-flow'
import { supabase } from '@/lib/supabase/client'

export type SaleCompletionViewModel = {
  movementId: string
  saleId: string
  buyerCounterpartyId: string
  materialId: string
  adoptedQuantityKg: number
  adoptedUnitPrice: number
  adoptedTotalAmount: number
  previousStockKg: number
  newStockKg: number
  decision: SaleDecision
  reason: string | null
  document: null | {
    id: string
    filename: string
    extractionStatus: 'pending' | 'accepted' | 'rejected' | 'needs_review'
  }
}

function decisionFromRuleCode(ruleCode: string | null | undefined): SaleDecision {
  if (ruleCode === 'SALE_USE_DOCUMENT_PRICE') return 'use_document'
  if (ruleCode === 'SALE_KEEP_REGISTERED_PRICE') return 'keep_registered'
  return 'registered_only'
}

export async function loadSaleCompletion(
  movementId: string,
  scope: ActiveScope,
): Promise<SaleCompletionViewModel> {
  let movementQuery = supabase
    .from('movements')
    .select('id, material_id, quantity_kg, status')
    .eq('id', movementId)
    .eq('movement_type', 'sale')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  movementQuery = scope.unitId === null
    ? movementQuery.is('unit_id', null)
    : movementQuery.eq('unit_id', scope.unitId)

  const { data: movement, error: movementError } = await movementQuery.single()
  if (movementError || !movement) throw movementError ?? new Error('Sale not found')
  if (movement.status !== 'posted') throw new Error('Sale is not posted')

  let saleQuery = supabase
    .from('sales')
    .select('id, buyer_counterparty_id, material_id, quantity_kg, unit_price, total_amount')
    .eq('movement_id', movementId)
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  saleQuery = scope.unitId === null
    ? saleQuery.is('unit_id', null)
    : saleQuery.eq('unit_id', scope.unitId)

  const { data: sale, error: saleError } = await saleQuery.single()
  if (saleError || !sale) throw saleError ?? new Error('Sale record not found')

  const { data: validation, error: validationError } = await supabase
    .from('validations')
    .select('rule_code, reason, document_id')
    .eq('movement_id', movementId)
    .eq('validation_type', 'operator_resolution')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (validationError) throw validationError

  const { data: evidence, error: evidenceError } = await supabase
    .from('evidences')
    .select('document_id')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (evidenceError) throw evidenceError

  const documentId = validation?.document_id ?? evidence?.document_id ?? null
  let document: SaleCompletionViewModel['document'] = null
  if (documentId) {
    const { data: documentRow, error: documentError } = await supabase
      .from('documents')
      .select('id, original_filename, extraction_status')
      .eq('id', documentId)
      .single()
    if (documentError || !documentRow) throw documentError ?? new Error('Sale document not found')
    document = {
      id: documentRow.id,
      filename: documentRow.original_filename,
      extractionStatus: documentRow.extraction_status,
    }
  }

  const { data: targetLedger, error: targetLedgerError } = await supabase
    .from('stock_ledger_entries')
    .select('id, delta_kg, created_at')
    .eq('movement_id', movementId)
    .eq('effect_kind', 'post')
    .single()
  if (targetLedgerError || !targetLedger) throw targetLedgerError ?? new Error('Sale ledger effect not found')

  let historyQuery = supabase
    .from('stock_ledger_entries')
    .select('id, delta_kg, created_at')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
    .eq('material_id', movement.material_id)
    .eq('effect_kind', 'post')
    .lte('created_at', targetLedger.created_at)
  historyQuery = scope.unitId === null
    ? historyQuery.is('unit_id', null)
    : historyQuery.eq('unit_id', scope.unitId)

  const { data: ledgerRows, error: ledgerError } = await historyQuery.order('created_at', { ascending: true })
  if (ledgerError || !ledgerRows) throw ledgerError ?? new Error('Sale ledger history not found')

  const newStockKg = ledgerRows.reduce((sum, row) => sum + Number(row.delta_kg), 0)
  const previousStockKg = newStockKg - Number(targetLedger.delta_kg)

  return {
    movementId,
    saleId: sale.id,
    buyerCounterpartyId: sale.buyer_counterparty_id,
    materialId: sale.material_id,
    adoptedQuantityKg: Number(sale.quantity_kg),
    adoptedUnitPrice: Number(sale.unit_price),
    adoptedTotalAmount: Number(sale.total_amount ?? 0),
    previousStockKg,
    newStockKg,
    decision: decisionFromRuleCode(validation?.rule_code),
    reason: validation?.reason ?? null,
    document,
  }
}
