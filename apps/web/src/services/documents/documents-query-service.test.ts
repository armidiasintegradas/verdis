import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { loadDocuments } from './documents-query-service'

const scope: ActiveScope = {
  tenantId: 'tenant-id',
  organizationId: 'org-id',
  unitId: 'unit-id',
}

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, any> = {}
  q.select = vi.fn(() => q)
  q.eq = vi.fn(() => q)
  q.is = vi.fn(() => q)
  q.in = vi.fn(() => q)
  q.order = vi.fn(async () => result)
  return q
}

beforeEach(() => vi.clearAllMocks())

describe('loadDocuments', () => {
  it('maps scoped receipt/sale documents and keeps processing separate from human review', async () => {
    const movements = chain({
      data: [
        { id: 'receipt-movement', movement_type: 'receipt', material_id: 'paper', quantity_kg: 480, occurred_at: '2026-09-16T10:00:00Z' },
        { id: 'sale-movement', movement_type: 'sale', material_id: 'pet', quantity_kg: 1000, occurred_at: '2026-09-16T11:00:00Z' },
        { id: 'processing-movement', movement_type: 'sale', material_id: 'pet', quantity_kg: 500, occurred_at: '2026-09-16T12:00:00Z' },
      ],
      error: null,
    })

    const tables: Record<string, any> = {
      movements,
      evidences: chain({
        data: [
          {
            id: 'receipt-evidence', movement_id: 'receipt-movement', document_id: 'receipt-doc',
            claimed_fields: { quantity_kg: 480 }, extracted_fields: { quantity_kg: 482 }, created_at: '2026-09-16T10:01:00Z',
          },
          {
            id: 'sale-evidence', movement_id: 'sale-movement', document_id: 'sale-doc',
            claimed_fields: { quantity_kg: 1000, unit_price: 3.1, total_amount: 3100 },
            extracted_fields: { quantity_kg: 1000, unit_price: 3.2, total_amount: 3200 }, created_at: '2026-09-16T11:01:00Z',
          },
          {
            id: 'processing-evidence', movement_id: 'processing-movement', document_id: 'processing-doc',
            claimed_fields: { quantity_kg: 500, unit_price: 3, total_amount: 1500 }, extracted_fields: {}, created_at: '2026-09-16T12:01:00Z',
          },
        ],
        error: null,
      }),
      documents: chain({
        data: [
          { id: 'receipt-doc', original_filename: 'Recibo_480.pdf', mime_type: 'application/pdf', extraction_status: 'accepted', uploaded_at: '2026-09-16T10:01:00Z' },
          { id: 'sale-doc', original_filename: 'Venda_1279.pdf', mime_type: 'application/pdf', extraction_status: 'accepted', uploaded_at: '2026-09-16T11:01:00Z' },
          { id: 'processing-doc', original_filename: 'Venda_nova.pdf', mime_type: 'application/pdf', extraction_status: 'pending', uploaded_at: '2026-09-16T12:01:00Z' },
        ],
        error: null,
      }),
      document_extractions: chain({
        data: [
          { id: 'rx', document_id: 'receipt-doc', confidence: 0.98, created_at: '2026-09-16T10:02:00Z' },
          { id: 'sx', document_id: 'sale-doc', confidence: 0.97, created_at: '2026-09-16T11:02:00Z' },
        ],
        error: null,
      }),
      validations: chain({
        data: [
          { movement_id: 'sale-movement', evidence_id: 'sale-evidence', document_id: 'sale-doc', validation_type: 'operator_resolution', rule_code: 'SALE_KEEP_REGISTERED_PRICE', reason: 'Preço negociado.', created_at: '2026-09-16T11:03:00Z' },
        ],
        error: null,
      }),
      materials: chain({
        data: [
          { id: 'paper', code: 'PAPELAO', name: 'Papelão Ondulado' },
          { id: 'pet', code: 'PET', name: 'PET' },
        ],
        error: null,
      }),
    }

    mocks.from.mockImplementation((table: string) => tables[table])

    await expect(loadDocuments(scope)).resolves.toEqual([
      expect.objectContaining({
        documentId: 'processing-doc', movementId: 'processing-movement', origin: 'sale',
        filename: 'Venda_nova.pdf', extractionState: 'processing', reviewState: 'none', materialLabel: 'PET',
      }),
      expect.objectContaining({
        documentId: 'sale-doc', movementId: 'sale-movement', origin: 'sale',
        extractionState: 'processed', reviewState: 'resolved', materialLabel: 'PET',
      }),
      expect.objectContaining({
        documentId: 'receipt-doc', movementId: 'receipt-movement', origin: 'receipt',
        extractionState: 'processed', reviewState: 'required', materialLabel: 'Papelão Ondulado',
      }),
    ])

    expect(movements.eq).toHaveBeenCalledWith('tenant_id', 'tenant-id')
    expect(movements.eq).toHaveBeenCalledWith('organization_id', 'org-id')
    expect(movements.eq).toHaveBeenCalledWith('unit_id', 'unit-id')
  })

  it('maps rejected extraction as failed and does not create review work', async () => {
    const tables: Record<string, any> = {
      movements: chain({ data: [{ id: 'm', movement_type: 'receipt', material_id: 'paper', quantity_kg: 10, occurred_at: '2026-09-16T10:00:00Z' }], error: null }),
      evidences: chain({ data: [{ id: 'e', movement_id: 'm', document_id: 'd', claimed_fields: { quantity_kg: 10 }, extracted_fields: {}, created_at: '2026-09-16T10:01:00Z' }], error: null }),
      documents: chain({ data: [{ id: 'd', original_filename: 'falha.pdf', mime_type: 'application/pdf', extraction_status: 'rejected', uploaded_at: '2026-09-16T10:01:00Z' }], error: null }),
      document_extractions: chain({ data: [], error: null }),
      validations: chain({ data: [], error: null }),
      materials: chain({ data: [{ id: 'paper', code: 'PAPELAO', name: 'Papelão' }], error: null }),
    }
    mocks.from.mockImplementation((table: string) => tables[table])

    const [item] = await loadDocuments(scope)
    expect(item).toMatchObject({ extractionState: 'failed', reviewState: 'none' })
  })
})
