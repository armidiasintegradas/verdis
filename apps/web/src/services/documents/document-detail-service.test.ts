import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { loadDocumentDetail } from './document-detail-service'

const scope: ActiveScope = {
  tenantId: 'tenant-id',
  organizationId: 'org-id',
  unitId: 'unit-id',
}

type Result = { data: any; error: any }

function query(result: Result) {
  const q: Record<string, any> = {}
  for (const method of ['select', 'eq', 'is', 'in', 'order', 'limit']) q[method] = vi.fn(() => q)
  q.single = vi.fn(async () => result)
  q.maybeSingle = vi.fn(async () => result)
  return q
}

function setupTables(results: Record<string, Result | Result[]>) {
  const queues = new Map<string, Result[]>()
  for (const [table, result] of Object.entries(results)) queues.set(table, Array.isArray(result) ? [...result] : [result])
  mocks.from.mockImplementation((table: string) => {
    const queue = queues.get(table)
    if (!queue?.length) throw new Error(`Unexpected table query: ${table}`)
    return query(queue.shift()!)
  })
}

function receiptFixture(options: { resolved?: boolean; extraction?: boolean } = {}) {
  setupTables({
    evidences: { data: {
      id: 'receipt-evidence', movement_id: 'receipt-movement', document_id: 'receipt-doc',
      claimed_fields: { quantity_kg: 480 }, extracted_fields: options.extraction === false ? {} : { quantity_kg: 482 }, confidence: 0.97,
    }, error: null },
    movements: { data: {
      id: 'receipt-movement', movement_type: 'receipt', material_id: 'paper', quantity_kg: 480,
      occurred_at: '2026-09-16T10:00:00Z', tenant_id: 'tenant-id', organization_id: 'org-id', unit_id: 'unit-id',
    }, error: null },
    documents: { data: {
      id: 'receipt-doc', original_filename: 'Recibo_480.pdf', mime_type: 'application/pdf', storage_path: 'tenant-id/org-id/receipt-movement/receipt.pdf',
      extraction_status: options.extraction === false ? 'pending' : 'accepted', uploaded_at: '2026-09-16T10:01:00Z',
    }, error: null },
    document_extractions: { data: options.extraction === false ? null : {
      id: 'rx', document_id: 'receipt-doc', confidence: 0.98, created_at: '2026-09-16T10:02:00Z',
    }, error: null },
    validations: { data: options.resolved ? {
      rule_code: 'RECEIPT_KEEP_REGISTERED_QUANTITY', reason: 'Peso conferido na balança.', created_at: '2026-09-16T10:03:00Z',
    } : null, error: null },
    materials: { data: { id: 'paper', code: 'PAPELAO', name: 'Papelão Ondulado' }, error: null },
  })
}

function saleFixture(options: { resolved?: boolean } = {}) {
  setupTables({
    evidences: { data: {
      id: 'sale-evidence', movement_id: 'sale-movement', document_id: 'sale-doc',
      claimed_fields: { quantity_kg: 1000, unit_price: 3.1, total_amount: 3100 },
      extracted_fields: { quantity_kg: 1000, unit_price: 3.2, total_amount: 3200 }, confidence: 0.95,
    }, error: null },
    movements: { data: {
      id: 'sale-movement', movement_type: 'sale', material_id: 'pet', quantity_kg: 1000,
      occurred_at: '2026-09-16T11:00:00Z', tenant_id: 'tenant-id', organization_id: 'org-id', unit_id: 'unit-id',
    }, error: null },
    documents: { data: {
      id: 'sale-doc', original_filename: 'Documento_Venda_1279.pdf', mime_type: 'application/pdf', storage_path: 'tenant-id/org-id/sale-movement/sale.pdf',
      extraction_status: 'accepted', uploaded_at: '2026-09-16T11:01:00Z',
    }, error: null },
    document_extractions: { data: { id: 'sx', document_id: 'sale-doc', confidence: 0.96, created_at: '2026-09-16T11:02:00Z' }, error: null },
    validations: { data: options.resolved ? {
      rule_code: 'SALE_USE_DOCUMENT_PRICE', reason: null, created_at: '2026-09-16T11:03:00Z',
    } : null, error: null },
    materials: { data: { id: 'pet', code: 'PET', name: 'PET' }, error: null },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('loadDocumentDetail', () => {
  it('reconstructs receipt 480 vs 482 and marks unresolved divergence for review', async () => {
    receiptFixture()
    const detail = await loadDocumentDetail('receipt-doc', scope)
    expect(detail).toMatchObject({
      documentId: 'receipt-doc', movementId: 'receipt-movement', origin: 'receipt', filename: 'Recibo_480.pdf',
      extractionState: 'processed', reviewState: 'required', confidence: 0.98,
      receiptComparison: { registeredQuantityKg: 480, documentQuantityKg: 482, differenceKg: 2, hasDivergence: true },
      saleComparison: null, resolution: null,
    })
    expect(detail?.receiptComparison?.differencePercent).toBeCloseTo(0.4166666667, 6)
  })

  it('keeps extraction separate from a persisted receipt keep_registered resolution', async () => {
    receiptFixture({ resolved: true })
    const detail = await loadDocumentDetail('receipt-doc', scope)
    expect(detail?.reviewState).toBe('resolved')
    expect(detail?.resolution).toEqual({
      decision: 'keep_registered', label: 'Valor registrado mantido', reason: 'Peso conferido na balança.', resolvedAt: '2026-09-16T10:03:00Z',
    })
    expect(detail?.receiptComparison?.documentQuantityKg).toBe(482)
  })

  it('reconstructs canonical sale commercial divergence without pre-resolving it', async () => {
    saleFixture()
    const detail = await loadDocumentDetail('sale-doc', scope)
    expect(detail).toMatchObject({
      origin: 'sale', extractionState: 'processed', reviewState: 'required', confidence: 0.96,
      receiptComparison: null,
      saleComparison: {
        registered: { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
        documentary: { quantityKg: 1000, unitPrice: 3.2, totalAmount: 3200 },
        hasDivergence: true,
      },
      resolution: null,
    })
    expect(detail?.saleComparison?.unitPriceDifference).toBeCloseTo(0.1, 10)
    expect(detail?.saleComparison?.totalDifference).toBe(100)
    expect(detail?.saleComparison?.percent).toBeCloseTo(3.2258064516, 6)
  })

  it('maps a persisted sale use_document resolution separately from extraction', async () => {
    saleFixture({ resolved: true })
    const detail = await loadDocumentDetail('sale-doc', scope)
    expect(detail?.reviewState).toBe('resolved')
    expect(detail?.resolution).toEqual({
      decision: 'use_document', label: 'Valores do documento adotados', reason: null, resolvedAt: '2026-09-16T11:03:00Z',
    })
  })

  it('does not invent extracted receipt values while the document is processing', async () => {
    receiptFixture({ extraction: false })
    const detail = await loadDocumentDetail('receipt-doc', scope)
    expect(detail).toMatchObject({ extractionState: 'processing', reviewState: 'none', resolution: null })
    expect(detail?.receiptComparison).toMatchObject({ registeredQuantityKg: 480, documentQuantityKg: null, differenceKg: null, differencePercent: null, hasDivergence: false })
  })

  it('returns null when ownership cannot be established in the active scope', async () => {
    setupTables({
      evidences: { data: { id: 'e', movement_id: 'other-movement', document_id: 'secret-doc', claimed_fields: {}, extracted_fields: {}, confidence: null }, error: null },
      movements: { data: null, error: null },
    })

    await expect(loadDocumentDetail('secret-doc', scope)).resolves.toBeNull()
    expect(mocks.from).not.toHaveBeenCalledWith('documents')
  })
})
