import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { loadSaleConference } from './sale-conference-service'

const scope: ActiveScope = {
  tenantId: 'tenant-id', organizationId: 'org-id', unitId: 'unit-id',
}

function chain(result: { data: unknown; error: unknown }, terminal: 'single' | 'maybeSingle' = 'single') {
  const q: Record<string, any> = {}
  q.select = vi.fn(() => q)
  q.eq = vi.fn(() => q)
  q.is = vi.fn(() => q)
  q.order = vi.fn(() => q)
  q.limit = vi.fn(() => q)
  q.single = vi.fn(async () => terminal === 'single' ? result : result)
  q.maybeSingle = vi.fn(async () => result)
  return q
}

function setupTables(input: {
  movement?: unknown
  sale?: unknown
  evidence?: unknown
  document?: unknown
  extraction?: unknown
}) {
  const tables: Record<string, any> = {
    movements: chain({ data: input.movement ?? { id: 'm1', quantity_kg: 1000 }, error: null }),
    sales: chain({ data: input.sale ?? { id: 's1', unit_price: 3.1, total_amount: 3100 }, error: null }),
    evidences: chain({ data: input.evidence ?? null, error: null }, 'maybeSingle'),
    documents: chain({ data: input.document ?? null, error: null }),
    document_extractions: chain({ data: input.extraction ?? null, error: null }, 'maybeSingle'),
  }
  mocks.from.mockImplementation((table: string) => tables[table])
}

beforeEach(() => vi.clearAllMocks())

describe('loadSaleConference', () => {
  it('returns registered_only when there is no evidence document', async () => {
    setupTables({ evidence: null })
    await expect(loadSaleConference('m1', scope)).resolves.toMatchObject({
      state: 'registered_only',
      registered: { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
      documentary: null,
      evidenceId: null,
    })
  })

  it('returns processing without inventing documentary values when extraction is missing', async () => {
    setupTables({
      evidence: { id: 'e1', document_id: 'd1' },
      document: { id: 'd1', original_filename: 'Documento_Venda_1279.pdf', extraction_status: 'pending' },
      extraction: null,
    })
    await expect(loadSaleConference('m1', scope)).resolves.toMatchObject({
      state: 'processing', documentary: null, evidenceId: 'e1',
      document: { filename: 'Documento_Venda_1279.pdf' },
    })
  })

  it('returns canonical 3.10 vs 3.20 divergence from the latest extraction', async () => {
    setupTables({
      evidence: { id: 'e1', document_id: 'd1' },
      document: { id: 'd1', original_filename: 'Documento_Venda_1279.pdf', extraction_status: 'accepted' },
      extraction: { id: 'x1', extracted_fields: { quantity_kg: 1000, unit_price: 3.2, total_amount: 3200 } },
    })
    const result = await loadSaleConference('m1', scope)
    expect(result.state).toBe('divergence')
    expect(result.documentary).toEqual({ quantityKg: 1000, unitPrice: 3.2, totalAmount: 3200 })
    expect(result.differences?.unitPriceDifference).toBeCloseTo(0.1, 10)
    expect(result.differences?.totalDifference).toBeCloseTo(100, 10)
    expect(result.differences?.percent).toBeCloseTo(3.2258064516, 8)
  })

  it('returns match when registered and documentary commercial values coincide', async () => {
    setupTables({
      evidence: { id: 'e1', document_id: 'd1' },
      document: { id: 'd1', original_filename: 'sale.pdf', extraction_status: 'accepted' },
      extraction: { id: 'x1', extracted_fields: { quantity_kg: 1000, unit_price: 3.1, total_amount: 3100 } },
    })
    await expect(loadSaleConference('m1', scope)).resolves.toMatchObject({ state: 'match' })
  })
})
