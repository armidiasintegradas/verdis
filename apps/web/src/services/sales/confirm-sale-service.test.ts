import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }))

import { confirmSale } from './confirm-sale-service'

const movementId = '60000000-0000-4000-8000-000000000001'
const evidenceId = '80000000-0000-4000-8000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rpc.mockResolvedValue({
    data: [{
      movement_id: movementId,
      sale_id: 'sale-id',
      adopted_quantity_kg: '1000',
      adopted_unit_price: '3.10',
      adopted_total_amount: '3100',
      previous_stock_kg: '3200',
      new_stock_kg: '2200',
    }],
    error: null,
  })
})

describe('confirmSale', () => {
  it('delegates keep_registered to confirm_sale_m1 and maps authoritative values', async () => {
    await expect(confirmSale({
      movementId,
      decision: 'keep_registered',
      evidenceId,
      reason: 'Preço negociado confirmado.',
    })).resolves.toEqual({
      movementId,
      saleId: 'sale-id',
      adoptedQuantityKg: 1000,
      adoptedUnitPrice: 3.1,
      adoptedTotalAmount: 3100,
      previousStockKg: 3200,
      newStockKg: 2200,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('confirm_sale_m1', {
      p_movement_id: movementId,
      p_decision: 'keep_registered',
      p_evidence_id: evidenceId,
      p_reason: 'Preço negociado confirmado.',
    })
  })

  it('passes null evidence and reason for registered_only', async () => {
    await confirmSale({ movementId, decision: 'registered_only', evidenceId: null, reason: null })
    expect(mocks.rpc).toHaveBeenCalledWith('confirm_sale_m1', {
      p_movement_id: movementId,
      p_decision: 'registered_only',
      p_evidence_id: null,
      p_reason: null,
    })
  })

  it('surfaces RPC errors without direct fallback mutations', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('confirmation failed') })
    await expect(confirmSale({ movementId, decision: 'use_document', evidenceId, reason: null })).rejects.toThrow('confirmation failed')
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })
})
