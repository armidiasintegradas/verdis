import type { Json } from '@/lib/supabase/database.types'
import type { ActiveScope } from '@/domain/scope'
import {
  calculateSaleCommercialDifference,
  type SaleConferenceState,
} from '@/domain/sale-flow'
import { supabase } from '@/lib/supabase/client'

export type SaleCommercialValues = {
  quantityKg: number
  unitPrice: number
  totalAmount: number
}

export type SaleConferenceViewModel = {
  movementId: string
  state: SaleConferenceState
  registered: SaleCommercialValues
  documentary: SaleCommercialValues | null
  differences: ReturnType<typeof calculateSaleCommercialDifference> | null
  evidenceId: string | null
  document: null | {
    id: string
    filename: string
    extractionStatus: 'pending' | 'accepted' | 'rejected' | 'needs_review'
  }
}

function commercialValuesFromJson(fields: Json): SaleCommercialValues | null {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null
  const quantityKg = fields.quantity_kg
  const unitPrice = fields.unit_price
  const totalAmount = fields.total_amount
  if (
    typeof quantityKg !== 'number' || !Number.isFinite(quantityKg) ||
    typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) ||
    typeof totalAmount !== 'number' || !Number.isFinite(totalAmount)
  ) return null

  return { quantityKg, unitPrice, totalAmount }
}

function baseView(
  movementId: string,
  registered: SaleCommercialValues,
  state: 'registered_only' | 'processing',
  evidenceId: string | null,
  document: SaleConferenceViewModel['document'],
): SaleConferenceViewModel {
  return {
    movementId,
    state,
    registered,
    documentary: null,
    differences: null,
    evidenceId,
    document,
  }
}

export async function loadSaleConference(
  movementId: string,
  scope: ActiveScope,
): Promise<SaleConferenceViewModel> {
  let movementQuery = supabase
    .from('movements')
    .select('id, quantity_kg')
    .eq('id', movementId)
    .eq('movement_type', 'sale')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  movementQuery = scope.unitId === null
    ? movementQuery.is('unit_id', null)
    : movementQuery.eq('unit_id', scope.unitId)

  const { data: movement, error: movementError } = await movementQuery.single()
  if (movementError || !movement) throw movementError ?? new Error('Sale not found')

  let saleQuery = supabase
    .from('sales')
    .select('id, quantity_kg, unit_price, total_amount')
    .eq('movement_id', movementId)
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  saleQuery = scope.unitId === null
    ? saleQuery.is('unit_id', null)
    : saleQuery.eq('unit_id', scope.unitId)

  const { data: sale, error: saleError } = await saleQuery.single()
  if (saleError || !sale) throw saleError ?? new Error('Sale record not found')

  const registered: SaleCommercialValues = {
    quantityKg: Number(movement.quantity_kg),
    unitPrice: Number(sale.unit_price),
    totalAmount: Number(sale.total_amount ?? 0),
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from('evidences')
    .select('id, document_id')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (evidenceError) throw evidenceError
  if (!evidence || !evidence.document_id) {
    return baseView(movementId, registered, 'registered_only', null, null)
  }

  const { data: documentRow, error: documentError } = await supabase
    .from('documents')
    .select('id, original_filename, extraction_status')
    .eq('id', evidence.document_id)
    .single()

  if (documentError || !documentRow) throw documentError ?? new Error('Sale document not found')

  const document = {
    id: documentRow.id,
    filename: documentRow.original_filename,
    extractionStatus: documentRow.extraction_status,
  }

  const { data: extraction, error: extractionError } = await supabase
    .from('document_extractions')
    .select('id, extracted_fields')
    .eq('document_id', documentRow.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (extractionError) throw extractionError
  if (!extraction) {
    return baseView(movementId, registered, 'processing', evidence.id, document)
  }

  const documentary = commercialValuesFromJson(extraction.extracted_fields)
  if (!documentary) {
    return baseView(movementId, registered, 'processing', evidence.id, document)
  }

  const differences = calculateSaleCommercialDifference({
    quantityKg: registered.quantityKg,
    registeredUnitPrice: registered.unitPrice,
    documentUnitPrice: documentary.unitPrice,
  })

  const matches =
    documentary.quantityKg === registered.quantityKg &&
    documentary.unitPrice === registered.unitPrice &&
    documentary.totalAmount === registered.totalAmount

  return {
    movementId,
    state: matches ? 'match' : 'divergence',
    registered,
    documentary,
    differences,
    evidenceId: evidence.id,
    document,
  }
}
