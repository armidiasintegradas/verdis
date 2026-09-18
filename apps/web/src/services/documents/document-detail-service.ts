import {
  deriveDocumentPresentationState,
  deriveReceiptDocumentComparison,
  deriveSaleDocumentComparison,
  type DocumentExtractionState,
  type DocumentOrigin,
  type DocumentReviewState,
  type ReceiptDocumentComparison,
} from '@/domain/document-center'
import type { ActiveScope } from '@/domain/scope'
import type { Json } from '@/lib/supabase/database.types'
import { supabase } from '@/lib/supabase/client'

export type DocumentResolutionDecision = 'registered_only' | 'use_document' | 'keep_registered'

export type DocumentResolution = {
  decision: DocumentResolutionDecision
  label: string
  reason: string | null
  resolvedAt: string | null
}

export type SaleDocumentDetailComparison = {
  registered: { quantityKg: number; unitPrice: number; totalAmount: number }
  documentary: { quantityKg: number | null; unitPrice: number | null; totalAmount: number | null }
  unitPriceDifference: number | null
  totalDifference: number | null
  percent: number | null
  hasDivergence: boolean
}

export type DocumentDetailViewModel = {
  documentId: string
  movementId: string
  origin: DocumentOrigin
  filename: string
  mimeType: string | null
  storagePath: string
  occurredAt: string
  material: { id: string; label: string | null } | null
  extractionState: DocumentExtractionState
  reviewState: DocumentReviewState
  confidence: number | null
  receiptComparison: ReceiptDocumentComparison | null
  saleComparison: SaleDocumentDetailComparison | null
  resolution: DocumentResolution | null
}

function numberField(fields: Json, key: string): number | null {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null
  const value = fields[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolutionFromRuleCode(
  origin: DocumentOrigin,
  ruleCode: string | null | undefined,
  reason: string | null | undefined,
  createdAt: string | null | undefined,
): DocumentResolution | null {
  if (origin === 'receipt') {
    if (ruleCode === 'RECEIPT_USE_DOCUMENT_QUANTITY') {
      return { decision: 'use_document', label: 'Valor do documento adotado', reason: reason ?? null, resolvedAt: createdAt ?? null }
    }
    if (ruleCode === 'RECEIPT_KEEP_REGISTERED_QUANTITY') {
      return { decision: 'keep_registered', label: 'Valor registrado mantido', reason: reason ?? null, resolvedAt: createdAt ?? null }
    }
  } else {
    if (ruleCode === 'SALE_USE_DOCUMENT_PRICE') {
      return { decision: 'use_document', label: 'Valores do documento adotados', reason: reason ?? null, resolvedAt: createdAt ?? null }
    }
    if (ruleCode === 'SALE_KEEP_REGISTERED_PRICE') {
      return { decision: 'keep_registered', label: 'Valores registrados mantidos', reason: reason ?? null, resolvedAt: createdAt ?? null }
    }
  }
  return null
}

export async function loadDocumentDetail(
  documentId: string,
  scope: ActiveScope,
): Promise<DocumentDetailViewModel | null> {
  const { data: evidence, error: evidenceError } = await supabase
    .from('evidences')
    .select('id, movement_id, document_id, claimed_fields, extracted_fields, confidence')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (evidenceError) throw evidenceError
  if (!evidence) return null

  let movementQuery = supabase
    .from('movements')
    .select('id, movement_type, material_id, quantity_kg, occurred_at, tenant_id, organization_id, unit_id')
    .eq('id', evidence.movement_id)
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  movementQuery = scope.unitId === null
    ? movementQuery.is('unit_id', null)
    : movementQuery.eq('unit_id', scope.unitId)

  const { data: movement, error: movementError } = await movementQuery.maybeSingle()
  if (movementError) throw movementError
  if (!movement || (movement.movement_type !== 'receipt' && movement.movement_type !== 'sale')) return null

  const origin = movement.movement_type as DocumentOrigin

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, original_filename, mime_type, storage_path, extraction_status, uploaded_at')
    .eq('id', documentId)
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
    .maybeSingle()

  if (documentError) throw documentError
  if (!document) return null

  const { data: extraction, error: extractionError } = await supabase
    .from('document_extractions')
    .select('id, document_id, confidence, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (extractionError) throw extractionError

  const { data: validation, error: validationError } = await supabase
    .from('validations')
    .select('rule_code, reason, created_at')
    .eq('movement_id', movement.id)
    .eq('validation_type', 'operator_resolution')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (validationError) throw validationError

  const { data: material, error: materialError } = await supabase
    .from('materials')
    .select('id, code, name')
    .eq('id', movement.material_id)
    .maybeSingle()
  if (materialError) throw materialError

  const resolution = resolutionFromRuleCode(origin, validation?.rule_code, validation?.reason, validation?.created_at)
  let receiptComparison: ReceiptDocumentComparison | null = null
  let saleComparison: SaleDocumentDetailComparison | null = null
  let hasActionableDivergence = false

  if (origin === 'receipt') {
    const registeredQuantity = numberField(evidence.claimed_fields, 'quantity_kg') ?? Number(movement.quantity_kg)
    const documentaryQuantity = extraction ? numberField(evidence.extracted_fields, 'quantity_kg') : null
    receiptComparison = deriveReceiptDocumentComparison(registeredQuantity, documentaryQuantity)
    hasActionableDivergence = extraction ? receiptComparison.hasDivergence : false
  } else {
    const registeredQuantity = numberField(evidence.claimed_fields, 'quantity_kg') ?? Number(movement.quantity_kg)
    const registeredUnitPrice = numberField(evidence.claimed_fields, 'unit_price') ?? 0
    const registeredTotal = numberField(evidence.claimed_fields, 'total_amount') ?? registeredQuantity * registeredUnitPrice
    const documentaryQuantity = extraction ? numberField(evidence.extracted_fields, 'quantity_kg') : null
    const documentaryUnitPrice = extraction ? numberField(evidence.extracted_fields, 'unit_price') : null
    const documentaryTotal = extraction ? numberField(evidence.extracted_fields, 'total_amount') : null

    if (documentaryQuantity !== null && documentaryUnitPrice !== null && documentaryTotal !== null) {
      const comparison = deriveSaleDocumentComparison(
        { quantityKg: registeredQuantity, unitPrice: registeredUnitPrice, totalAmount: registeredTotal },
        { quantityKg: documentaryQuantity, unitPrice: documentaryUnitPrice, totalAmount: documentaryTotal },
      )
      saleComparison = {
        registered: comparison.registered,
        documentary: comparison.documentary,
        unitPriceDifference: comparison.unitPriceDifference,
        totalDifference: comparison.totalDifference,
        percent: comparison.percent,
        hasDivergence: comparison.hasDivergence,
      }
      hasActionableDivergence = comparison.hasDivergence
    } else {
      saleComparison = {
        registered: { quantityKg: registeredQuantity, unitPrice: registeredUnitPrice, totalAmount: registeredTotal },
        documentary: { quantityKg: documentaryQuantity, unitPrice: documentaryUnitPrice, totalAmount: documentaryTotal },
        unitPriceDifference: null,
        totalDifference: null,
        percent: null,
        hasDivergence: false,
      }
    }
  }

  const presentation = deriveDocumentPresentationState({
    extractionExists: Boolean(extraction),
    extractionStatus: document.extraction_status,
    hasActionableDivergence,
    hasHumanResolution: Boolean(resolution),
  })

  return {
    documentId: document.id,
    movementId: movement.id,
    origin,
    filename: document.original_filename,
    mimeType: document.mime_type,
    storagePath: document.storage_path,
    occurredAt: movement.occurred_at,
    material: material ? { id: material.id, label: material.name || material.code || null } : null,
    extractionState: presentation.extractionState,
    reviewState: presentation.reviewState,
    confidence: extraction?.confidence === null || extraction?.confidence === undefined
      ? (evidence.confidence === null ? null : Number(evidence.confidence))
      : Number(extraction.confidence),
    receiptComparison,
    saleComparison,
    resolution,
  }
}
