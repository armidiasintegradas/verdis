import { beforeEach, expect, test, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'
import { createMovement } from './create-movement'

const insert = vi.fn()
const select = vi.fn()
const single = vi.fn()
const from = vi.fn()
const getUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser },
    from,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()

  single.mockResolvedValue({ data: { id: 'movement-id' }, error: null })
  select.mockReturnValue({ single })
  insert.mockReturnValue({ select })
  from.mockReturnValue({ insert })
  getUser.mockResolvedValue({
    data: { user: { id: 'authenticated-user-id' } },
    error: null,
  })
})

test('always derives security-sensitive scope and creator from trusted context', async () => {
  const scope: ActiveScope = {
    tenantId: '10000000-0000-4000-8000-000000000001',
    organizationId: '20000000-0000-4000-8000-000000000001',
    unitId: '30000000-0000-4000-8000-000000000001',
  }

  const input = {
    movementType: 'inbound' as const,
    materialId: '40000000-0000-4000-8000-000000000001',
    quantityKg: 100,
    occurredAt: '2026-09-15T12:00:00.000Z',
    tenant_id: 'malicious-tenant',
    organization_id: 'malicious-organization',
    created_by: 'malicious-user',
  }

  await expect(createMovement(scope, input)).resolves.toEqual({ id: 'movement-id' })

  expect(from).toHaveBeenCalledWith('movements')
  expect(insert).toHaveBeenCalledWith({
    tenant_id: scope.tenantId,
    organization_id: scope.organizationId,
    unit_id: scope.unitId,
    movement_type: 'inbound',
    material_id: input.materialId,
    quantity_kg: 100,
    occurred_at: input.occurredAt,
    created_by: 'authenticated-user-id',
    status: 'draft',
    source_organization_id: null,
    source_unit_id: null,
    source_counterparty_id: null,
    destination_organization_id: null,
    destination_unit_id: null,
    destination_counterparty_id: null,
    adjustment_reason: null,
  })
})

test('surfaces authentication errors before inserting', async () => {
  getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  })

  await expect(
    createMovement(
      {
        tenantId: '10000000-0000-4000-8000-000000000001',
        organizationId: '20000000-0000-4000-8000-000000000001',
        unitId: null,
      },
      {
        movementType: 'receipt',
        materialId: '40000000-0000-4000-8000-000000000001',
        quantityKg: 10,
        occurredAt: '2026-09-15T12:00:00.000Z',
      },
    ),
  ).rejects.toThrow('Authenticated user is required')

  expect(insert).not.toHaveBeenCalled()
})
