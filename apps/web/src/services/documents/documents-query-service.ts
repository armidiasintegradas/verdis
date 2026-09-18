import type { ActiveScope } from '@/domain/scope'
import {
  deriveDocumentPresentationState,
  deriveReceiptDocumentComparison,
  deriveSaleDocumentComparison,
  type DocumentExtractionState,
  type DocumentOrigin,
  type DocumentReviewState,
} from '@/domain/document-center'
import type { Json } from '@/lib/supabase/database.types'
import { supabase } from '@/lib/supabase/client'

export type DocumentListItem = {
  documentId: string
  movementId: string
  origin: DocumentOrigin
  filename: string
  mimeType: string | null
  occurredAt: string
  materialId: string | null
  materialLabel: string | null
  extractionState: DocumentExtractionState
  reviewState: DocumentReviewState
  movementLabel: string
}

function numberField(fields: Json, key: string): number | null {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null
  const value = fields[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function latestBy<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const result = new Map<string, T>()
  for (const row of rows) {
    const id = key(row)
    if (!result.has(id)) result.set(id, row)
  }
  return result
}

export async function loadDocuments(scope: ActiveScope): Promise<DocumentListItem[]> {
  let movementQuery = supabase
    .from('movements')
    .select('id, movement_type, material_id, quantity_kg, occurred_at')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  movementQuery = scope.unitId === null
    ? movementQuery.is('unit_id', null)
    : movementQuery.eq('unit_id', scope.unitId)

  const { data: movementRows, error: movementError } = await movementQuery.order('occurred_at', { ascending: false })
  if (movementError) throw movementError

  const movements = (movementRows ?? []).filter((row) => row.movement_type === 'receipt' || row.movement_type === 'sale')
  if (movements.length === 0) return []

  const movementIds = movements.map((row) => row.id)
  const materialIds = [...new Set(movements.map((row) => row.material_id))]

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from('evidences')
    .select('id, movement_id, document_id, claimed_fields, extracted_fields, created_at')
    .in('movement_id', movementIds)
    .order('created_at', { ascending: false })
  if (evidenceError) throw evidenceError

  const latestEvidenceByMovement = latestBy(
    (evidenceRows ?? []).filter((row) => row.document_id !== null),
    (row) => row.movement_id,
  )
  const documentIds = [...new Set([...latestEvidenceByMovement.values()].map((row) => row.document_id).filter((id): id is string => id !== null))]
  if (documentIds.length === 0) return []

  const { data: documentRows, error: documentError } = await supabase
    .from('documents')
    .select('id, original_filename, mime_type, extraction_status, uploaded_at')
    .in('id', documentIds)
    .order('uploaded_at', { ascending: false })
  if (documentError) throw documentError

  const { data: extractionRows, error: extractionError } = await supabase
    .from('document_extractions')
    .select('id, document_id, confidence, created_at')
    .in('document_id', documentIds)
    .order('created_at', { ascending: false })
  if (extractionError) throw extractionError

  const { data: validationRows, error: validationError } = await supabase
    .from('validations')
    .select('movement_id, evidence_id, document_id, validation_type, rule_code, reason, created_at')
    .eq('validation_type', 'operator_resolution')
    .in('movement_id', movementIds)
    .order('created_at', { ascending: false })
  if (validationError) throw validationError

  const { data: materialRows, error: materialError } = await supabase
    .from('materials')
    .select('id, code, name')
    .in('id', materialIds)
    .order('name', { ascending: true })
  if (materialError) throw materialError

  const documentsById = new Map((documentRows ?? []).map((row) => [row.id, row]))
  const extractionByDocument = latestBy(extractionRows ?? [], (row) => row.document_id)
  const validationByMovement = latestBy(validationRows ?? [], (row) => row.movement_id ?? '')
  const materialsById = new Map((materialRows ?? []).map((row) => [row.id, row]))

  const items = movements.flatMap<DocumentListItem>((movement) => {
    const evidence = latestEvidenceByMovement.get(movement.id)
    if (!evidence?.document_id) return []
    const document = documentsById.get(evidence.document_id)
    if (!document) return []

    const origin = movement.movement_type as DocumentOrigin
    const extraction = extractionByDocument.get(document.id)
    const validation = validationByMovement.get(movement.id)
    let hasActionableDivergence = false

    if (extraction) {
      if (origin === 'receipt') {
        const registered = numberField(evidence.claimed_fields, 'quantity_kg') ?? Number(movement.quantity_kg)
        const documentary = numberField(evidence.extracted_fields, 'quantity_kg')
        hasActionableDivergence = deriveReceiptDocumentComparison(registered, documentary).hasDivergence
      } else {
        const registeredQuantity = numberField(evidence.claimed_fields, 'quantity_kg')
        const registeredUnitPrice = numberField(evidence.claimed_fields, 'unit_price')
        const registeredTotal = numberField(evidence.claimed_fields, 'total_amount')
        const documentaryQuantity = numberField(evidence.extracted_fields, 'quantity_kg')
        const documentaryUnitPrice = numberField(evidence.extracted_fields, 'unit_price')
        const documentaryTotal = numberField(evidence.extracted_fields, 'total_amount')
        if (
          registeredQuantity !== null && registeredUnitPrice !== null && registeredTotal !== null &&
          documentaryQuantity !== null && documentaryUnitPrice !== null && documentaryTotal !== null
        ) {
          hasActionableDivergence = deriveSaleDocumentComparison(
            { quantityKg: registeredQuantity, unitPrice: registeredUnitPrice, totalAmount: registeredTotal },
            { quantityKg: documentaryQuantity, unitPrice: documentaryUnitPrice, totalAmount: documentaryTotal },
          ).hasDivergence
        }
      }
    }

    const presentation = deriveDocumentPresentationState({
      extractionExists: Boolean(extraction),
      extractionStatus: document.extraction_status,
      hasActionableDivergence,
      hasHumanResolution: Boolean(validation),
    })
    const material = materialsById.get(movement.material_id)

    return [{
      documentId: document.id,
      movementId: movement.id,
      origin,
      filename: document.original_filename,
      mimeType: document.mime_type,
      occurredAt: movement.occurred_at,
      materialId: movement.material_id,
      materialLabel: material?.name || material?.code || null,
      extractionState: presentation.extractionState,
      reviewState: presentation.reviewState,
      movementLabel: origin === 'receipt' ? 'Recebimento' : 'Venda',
    }]
  })

  return items.sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
}
