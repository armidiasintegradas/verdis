import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: mocks.rpc },
}))

import { confirmReceipt } from './confirm-receipt-service'

const movementId = '60000000-0000-4000-8000-000000000001'
const evidenceId = '80000000-0000-4000-8000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.rpc.mockResolvedValue({
    data: [
      {
        movement_id: movementId,
        adopted_quantity_kg: '480',
        previous_stock_kg: '7940',
        new_stock_kg: '8420',
      },
    ],
    error: null,
  })
})

describe('confirmReceipt', () => {
  it('delegates keep-registered confirmation exclusively to the database RPC', async () => {
    await expect(
      confirmReceipt({
        movementId,
        decision: 'keep_registered',
        evidenceId,
        reason: 'Quantidade operacional confirmada.',
      }),
    ).resolves.toEqual({
      movementId,
      adoptedQuantityKg: 480,
      previousStockKg: 7940,
      newStockKg: 8420,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('confirm_receipt_m1', {
      p_movement_id: movementId,
      p_decision: 'keep_registered',
      p_evidence_id: evidenceId,
      p_reason: 'Quantidade operacional confirmada.',
    })
  })

  it('passes null evidence and reason for a registered-only confirmation', async () => {
    await confirmReceipt({
      movementId,
      decision: 'registered_only',
      evidenceId: null,
      reason: null,
    })

    expect(mocks.rpc).toHaveBeenCalledWith('confirm_receipt_m1', {
      p_movement_id: movementId,
      p_decision: 'registered_only',
      p_evidence_id: null,
      p_reason: null,
    })
  })

  it('surfaces RPC failures without attempting a direct mutation fallback', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('confirmation failed') })

    await expect(
      confirmReceipt({
        movementId,
        decision: 'use_document',
        evidenceId,
        reason: null,
      }),
    ).rejects.toThrow('confirmation failed')

    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })
})
