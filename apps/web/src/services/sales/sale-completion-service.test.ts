import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { loadSaleCompletion } from './sale-completion-service'

const scope: ActiveScope = { tenantId: 'tenant-id', organizationId: 'org-id', unitId: 'unit-id' }

function query(result: { data: unknown; error: unknown }) {
  const q: Record<string, any> = {}
  for (const name of ['select', 'eq', 'is', 'order', 'limit', 'lte']) q[name] = vi.fn(() => q)
  q.single = vi.fn(async () => result)
  q.maybeSingle = vi.fn(async () => result)
  return q
}

beforeEach(() => vi.clearAllMocks())

describe('loadSaleCompletion', () => {
  it('reconstructs posted commercial values, stock, document and keep_registered decision from durable facts', async () => {
    const responses: Record<string, any[]> = {
      movements: [query({ data: { id: 'm1', material_id: 'pet', quantity_kg: 1000, status: 'posted' }, error: null })],
      sales: [query({ data: { id: 's1', buyer_counterparty_id: 'buyer', material_id: 'pet', quantity_kg: 1000, unit_price: 3.1, total_amount: 3100 }, error: null })],
      validations: [query({ data: { rule_code: 'SALE_KEEP_REGISTERED_PRICE', reason: 'Preço negociado confirmado.', document_id: 'd1' }, error: null })],
      evidences: [query({ data: { document_id: 'd1' }, error: null })],
      documents: [query({ data: { id: 'd1', original_filename: 'Documento_Venda_1279.pdf', extraction_status: 'accepted' }, error: null })],
      stock_ledger_entries: [
        query({ data: { id: 'l2', delta_kg: -1000, created_at: '2026-09-16T21:35:00Z' }, error: null }),
        (() => {
          const q = query({ data: null, error: null })
          q.order = vi.fn(async () => ({ data: [
            { id: 'l1', delta_kg: 3200, created_at: '2026-09-16T20:00:00Z' },
            { id: 'l2', delta_kg: -1000, created_at: '2026-09-16T21:35:00Z' },
          ], error: null }))
          return q
        })(),
      ],
    }
    mocks.from.mockImplementation((table: string) => responses[table].shift())

    await expect(loadSaleCompletion('m1', scope)).resolves.toEqual({
      movementId: 'm1',
      saleId: 's1',
      buyerCounterpartyId: 'buyer',
      materialId: 'pet',
      adoptedQuantityKg: 1000,
      adoptedUnitPrice: 3.1,
      adoptedTotalAmount: 3100,
      previousStockKg: 3200,
      newStockKg: 2200,
      decision: 'keep_registered',
      reason: 'Preço negociado confirmado.',
      document: { id: 'd1', filename: 'Documento_Venda_1279.pdf', extractionStatus: 'accepted' },
    })
  })

  it('uses registered_only when no operator resolution exists', async () => {
    const responses: Record<string, any[]> = {
      movements: [query({ data: { id: 'm1', material_id: 'pet', quantity_kg: 1000, status: 'posted' }, error: null })],
      sales: [query({ data: { id: 's1', buyer_counterparty_id: 'buyer', material_id: 'pet', quantity_kg: 1000, unit_price: 3.1, total_amount: 3100 }, error: null })],
      validations: [query({ data: null, error: null })],
      evidences: [query({ data: null, error: null })],
      stock_ledger_entries: [
        query({ data: { id: 'l2', delta_kg: -1000, created_at: '2026-09-16T21:35:00Z' }, error: null }),
        (() => { const q = query({ data: null, error: null }); q.order = vi.fn(async () => ({ data: [{ id: 'l2', delta_kg: -1000, created_at: '2026-09-16T21:35:00Z' }], error: null })); return q })(),
      ],
    }
    mocks.from.mockImplementation((table: string) => responses[table].shift())
    const result = await loadSaleCompletion('m1', scope)
    expect(result.decision).toBe('registered_only')
    expect(result.document).toBeNull()
  })
})
