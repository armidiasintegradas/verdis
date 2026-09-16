import type { Json } from '@/lib/supabase/database.types'
import type { ActiveScope } from '@/domain/scope'
import {
  calculateQuantityDifference,
  deriveConferenceState,
  type ReceiptConferenceState,
} from '@/domain/receipt-flow'
import { supabase } from '@/lib/supabase/client'

export type ReceiptConferenceViewModel = {
  movementId: string
  registeredQuantityKg: number
  documentQuantityKg: number | null
  state: ReceiptConferenceState
  differenceKg: number | null
  differencePercent: number | null
  evidenceId: string | null
  document: null | {
    id: string
    filename: string
    extractionStatus: 'pending' | 'accepted' | 'rejected' | 'needs_review'
  }
}

function quantityFromExtractedFields(fields: Json): number | null {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null
  const value = fields.quantity_kg
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function processingView(
  movementId: string,
  registeredQuantityKg: number,
  evidenceId: string | null,
  document: ReceiptConferenceViewModel['document'],
): ReceiptConferenceViewModel {
  return {
    movementId,
    registeredQuantityKg,
    documentQuantityKg: null,
    state: 'processing',
    differenceKg: null,
    differencePercent: null,
    evidenceId,
    document,
  }
}

export async function loadReceiptConference(
  movementId: string,
  scope: ActiveScope,
): Promise<ReceiptConferenceViewModel> {
  let movementQuery = supabase
    .from('movements')
    .select('id, quantity_kg')
    .eq('id', movementId)
    .eq('movement_type', 'receipt')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  movementQuery = scope.unitId === null
    ? movementQuery.is('unit_id', null)
    : movementQuery.eq('unit_id', scope.unitId)

  const { data: movement, error: movementError } = await movementQuery.single()
  if (movementError || !movement) {
    throw movementError ?? new Error('Receipt not found')
  }

  const registeredQuantityKg = Number(movement.quantity_kg)

  const { data: evidence, error: evidenceError } = await supabase
    .from('evidences')
    .select('id, document_id, extracted_fields')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (evidenceError) throw evidenceError
  if (!evidence || !evidence.document_id) {
    return processingView(movementId, registeredQuantityKg, null, null)
  }

  const { data: documentRow, error: documentError } = await supabase
    .from('documents')
    .select('id, original_filename, extraction_status')
    .eq('id', evidence.document_id)
    .single()

  if (documentError || !documentRow) {
    throw documentError ?? new Error('Receipt document not found')
  }

  const document = {
    id: documentRow.id,
    filename: documentRow.original_filename,
    extractionStatus: documentRow.extraction_status,
  }

  const { data: extraction, error: extractionError } = await supabase
    .from('document_extractions')
    .select('id')
    .eq('document_id', documentRow.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (extractionError) throw extractionError
  if (!extraction) {
    return processingView(movementId, registeredQuantityKg, evidence.id, document)
  }

  const documentQuantityKg = quantityFromExtractedFields(evidence.extracted_fields)
  const state = deriveConferenceState({
    extractionFinished: true,
    registeredKg: registeredQuantityKg,
    documentKg: documentQuantityKg,
  })

  if (state === 'processing' || documentQuantityKg === null) {
    return processingView(movementId, registeredQuantityKg, evidence.id, document)
  }

  const difference = calculateQuantityDifference(registeredQuantityKg, documentQuantityKg)

  return {
    movementId,
    registeredQuantityKg,
    documentQuantityKg,
    state,
    differenceKg: difference.absoluteKg,
    differencePercent: difference.percent,
    evidenceId: evidence.id,
    document,
  }
}
