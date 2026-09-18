import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { loadSaleFormOptions } from './sale-form-options-service'

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
  q.order = vi.fn(async () => result)
  return q
}

beforeEach(() => vi.clearAllMocks())

describe('loadSaleFormOptions', () => {
  it('returns scoped buyer labels and material stock for the bootstrap sale form', async () => {
    const tables: Record<string, any> = {
      counterparties: chain({
        data: [{ id: 'buyer-id', external_name: 'Comprador Demo' }],
        error: null,
      }),
      materials: chain({
        data: [{ id: 'material-id', code: 'PET', name: 'PET' }],
        error: null,
      }),
      current_stock: chain({
        data: [{ material_id: 'material-id', quantity_kg: 3200 }],
        error: null,
      }),
    }
    mocks.from.mockImplementation((table: string) => tables[table])

    await expect(loadSaleFormOptions(scope)).resolves.toEqual({
      buyers: [{ id: 'buyer-id', label: 'Comprador Demo' }],
      materials: [{ id: 'material-id', code: 'PET', label: 'PET', availableStockKg: 3200 }],
    })
  })
})
