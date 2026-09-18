import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({
  createMovement: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  single: vi.fn(),
}))

vi.mock('@/services/movements/create-movement', () => ({
  createMovement: mocks.createMovement,
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: mocks.from },
}))

import {
  createReceiptDraft,
  getReceiptDraft,
  updateReceiptDraft,
} from './receipt-draft-service'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const input = {
  materialId: '40000000-0000-4000-8000-000000000001',
  quantityKg: 480,
  occurredAt: '2026-09-15T21:20:00.000Z',
  sourceCounterpartyId: '50000000-0000-4000-8000-000000000001',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createMovement.mockResolvedValue({ id: 'movement-id' })

  const builder = {
    update: mocks.update,
    select: mocks.select,
    eq: mocks.eq,
    is: mocks.is,
    single: mocks.single,
  }
  mocks.from.mockReturnValue(builder)
  mocks.update.mockReturnValue(builder)
  mocks.select.mockReturnValue(builder)
  mocks.eq.mockReturnValue(builder)
  mocks.is.mockReturnValue(builder)
})

describe('receipt draft service', () => {
  it('creates a receipt draft through the generic movement service', async () => {
    await expect(createReceiptDraft(scope, input)).resolves.toEqual({ id: 'movement-id' })

    expect(mocks.createMovement).toHaveBeenCalledWith(scope, {
      movementType: 'receipt',
      materialId: input.materialId,
      quantityKg: 480,
      occurredAt: input.occurredAt,
      sourceCounterpartyId: input.sourceCounterpartyId,
    })
  })

  it('updates only wizard-editable fields on the scoped receipt draft', async () => {
    mocks.single.mockResolvedValue({ data: { id: 'movement-id' }, error: null })

    await updateReceiptDraft('movement-id', scope, input)

    expect(mocks.from).toHaveBeenCalledWith('movements')
    expect(mocks.update).toHaveBeenCalledWith({
      material_id: input.materialId,
      quantity_kg: 480,
      occurred_at: input.occurredAt,
      source_counterparty_id: input.sourceCounterpartyId,
    })
    expect(mocks.eq).toHaveBeenCalledWith('id', 'movement-id')
    expect(mocks.eq).toHaveBeenCalledWith('tenant_id', scope.tenantId)
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', scope.organizationId)
    expect(mocks.eq).toHaveBeenCalledWith('unit_id', scope.unitId)
    expect(mocks.eq).toHaveBeenCalledWith('movement_type', 'receipt')
    expect(mocks.eq).toHaveBeenCalledWith('status', 'draft')
  })

  it('loads only the scoped receipt fields needed by the wizard', async () => {
    mocks.single.mockResolvedValue({
      data: {
        id: 'movement-id',
        material_id: input.materialId,
        quantity_kg: 480,
        occurred_at: input.occurredAt,
        source_counterparty_id: input.sourceCounterpartyId,
        status: 'draft',
      },
      error: null,
    })

    await expect(getReceiptDraft('movement-id', scope)).resolves.toEqual({
      id: 'movement-id',
      materialId: input.materialId,
      quantityKg: 480,
      occurredAt: input.occurredAt,
      sourceCounterpartyId: input.sourceCounterpartyId,
      status: 'draft',
    })

    expect(mocks.select).toHaveBeenCalledWith(
      'id, material_id, quantity_kg, occurred_at, source_counterparty_id, status',
    )
    expect(mocks.eq).toHaveBeenCalledWith('movement_type', 'receipt')
  })

  it('uses an IS NULL unit filter when the active scope has no unit', async () => {
    mocks.single.mockResolvedValue({
      data: {
        id: 'movement-id',
        material_id: input.materialId,
        quantity_kg: 480,
        occurred_at: input.occurredAt,
        source_counterparty_id: null,
        status: 'draft',
      },
      error: null,
    })

    await getReceiptDraft('movement-id', { ...scope, unitId: null })

    expect(mocks.is).toHaveBeenCalledWith('unit_id', null)
  })

  it('surfaces a stable not-found error for a missing scoped draft', async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    })

    await expect(getReceiptDraft('missing', scope)).rejects.toThrow('Receipt draft not found')
  })
})
