import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}))

import {
  createSaleDraft,
  getSaleDraft,
  updateSaleDraft,
} from './sale-draft-service'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const input = {
  buyerCounterpartyId: '40000000-0000-4000-8000-000000000001',
  materialId: '50000000-0000-4000-8000-000000000001',
  quantityKg: 1000,
  unitPrice: 3.1,
  soldAt: '2026-09-15T21:35:00.000Z',
}

function builder() {
  const value = {
    select: mocks.select,
    eq: mocks.eq,
    is: mocks.is,
    single: mocks.single,
    maybeSingle: mocks.maybeSingle,
  }
  mocks.select.mockReturnValue(value)
  mocks.eq.mockReturnValue(value)
  mocks.is.mockReturnValue(value)
  return value
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockImplementation(() => builder())
})

describe('sale draft service', () => {
  it('creates the movement and sale atomically through create_sale_draft_m1', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ movement_id: 'movement-id', sale_id: 'sale-id', total_amount: 3100 }],
      error: null,
    })

    await expect(createSaleDraft(scope, input)).resolves.toEqual({
      movementId: 'movement-id',
      saleId: 'sale-id',
      totalAmount: 3100,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('create_sale_draft_m1', {
      p_buyer_counterparty_id: input.buyerCounterpartyId,
      p_material_id: input.materialId,
      p_quantity_kg: 1000,
      p_unit_price: 3.1,
      p_sold_at: input.soldAt,
      p_organization_id: scope.organizationId,
      p_unit_id: scope.unitId,
    })
  })

  it('updates an existing draft only through update_sale_draft_m1', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ movement_id: 'movement-id', sale_id: 'sale-id', total_amount: 3100 }],
      error: null,
    })

    await expect(updateSaleDraft('movement-id', scope, input)).resolves.toEqual({
      movementId: 'movement-id',
      saleId: 'sale-id',
      totalAmount: 3100,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('update_sale_draft_m1', {
      p_movement_id: 'movement-id',
      p_buyer_counterparty_id: input.buyerCounterpartyId,
      p_material_id: input.materialId,
      p_quantity_kg: 1000,
      p_unit_price: 3.1,
      p_sold_at: input.soldAt,
    })
  })

  it('loads a scoped sale draft plus the current stock for its material', async () => {
    mocks.single
      .mockResolvedValueOnce({
        data: {
          id: 'movement-id',
          material_id: input.materialId,
          quantity_kg: 1000,
          occurred_at: input.soldAt,
          status: 'draft',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'sale-id',
          buyer_counterparty_id: input.buyerCounterpartyId,
          material_id: input.materialId,
          quantity_kg: 1000,
          unit_price: 3.1,
          total_amount: 3100,
          sold_at: input.soldAt,
        },
        error: null,
      })
    mocks.maybeSingle.mockResolvedValue({ data: { quantity_kg: 3200 }, error: null })

    await expect(getSaleDraft('movement-id', scope)).resolves.toEqual({
      movementId: 'movement-id',
      saleId: 'sale-id',
      status: 'draft',
      buyerCounterpartyId: input.buyerCounterpartyId,
      materialId: input.materialId,
      quantityKg: 1000,
      unitPrice: 3.1,
      totalAmount: 3100,
      soldAt: input.soldAt,
      availableStockKg: 3200,
    })

    expect(mocks.from).toHaveBeenCalledWith('movements')
    expect(mocks.from).toHaveBeenCalledWith('sales')
    expect(mocks.from).toHaveBeenCalledWith('current_stock')
    expect(mocks.eq).toHaveBeenCalledWith('tenant_id', scope.tenantId)
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', scope.organizationId)
    expect(mocks.eq).toHaveBeenCalledWith('unit_id', scope.unitId)
  })

  it('treats a missing current_stock row as zero available stock', async () => {
    mocks.single
      .mockResolvedValueOnce({
        data: {
          id: 'movement-id', material_id: input.materialId, quantity_kg: 1000,
          occurred_at: input.soldAt, status: 'draft',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'sale-id', buyer_counterparty_id: input.buyerCounterpartyId,
          material_id: input.materialId, quantity_kg: 1000, unit_price: 3.1,
          total_amount: 3100, sold_at: input.soldAt,
        },
        error: null,
      })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await getSaleDraft('movement-id', scope)
    expect(result.availableStockKg).toBe(0)
  })
})
