import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'
import {
  claimAuditException,
  getCustodyChain,
  getSubjectTimeline,
  listAuditEvents,
  listAuditExceptions,
  openAuditException,
  resolveAuditException,
} from './audit-service'

const scope: ActiveScope = {
  tenantId: 'tenant-pilot-01',
  organizationId: 'org-coop-01',
  unitId: 'unit-galpao-01',
}

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

function createQueryChain(result: { data: unknown; error: unknown }) {
  const query: Record<string, any> = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.is = vi.fn(() => query)
  query.in = vi.fn(() => query)
  query.gte = vi.fn(() => query)
  query.lte = vi.fn(() => query)
  query.or = vi.fn(() => query)
  query.order = vi.fn(async () => result)
  return query
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Audit & Traceability — Cross-Flow Evidentiary Integration', () => {
  it('connects movement, evidence document, and custody lot in a unified timeline', async () => {
    const movementEvents = [
      {
        id: 'evt-mov-create',
        tenant_id: 'tenant-pilot-01',
        organization_id: 'org-coop-01',
        unit_id: 'unit-galpao-01',
        actor_user_id: 'user-weighing-operator',
        action: 'movement.created',
        subject_type: 'movement',
        subject_id: 'mov-receipt-001',
        correlation_id: 'corr-flow-001',
        causation_event_id: null,
        justification: 'Entrada de PET prensado na cooperativa',
        previous_state: null,
        new_state: { status: 'draft', quantity_kg: 1200 },
        technical_context: { source: 'weighing_scale' },
        occurred_at: '2026-09-16T10:00:00Z',
      },
      {
        id: 'evt-doc-attach',
        tenant_id: 'tenant-pilot-01',
        organization_id: 'org-coop-01',
        unit_id: 'unit-galpao-01',
        actor_user_id: 'user-doc-manager',
        action: 'evidence.created',
        subject_type: 'movement',
        subject_id: 'mov-receipt-001',
        correlation_id: 'corr-flow-001',
        causation_event_id: 'evt-mov-create',
        justification: 'Comprovante de pesagem digitalizado e anexado',
        previous_state: null,
        new_state: { document_id: 'doc-ticket-001', sha256: 'abc123sha' },
        technical_context: { ocr_status: 'completed' },
        occurred_at: '2026-09-16T10:05:00Z',
      },
      {
        id: 'evt-lot-generate',
        tenant_id: 'tenant-pilot-01',
        organization_id: 'org-coop-01',
        unit_id: 'unit-galpao-01',
        actor_user_id: 'user-supervisor',
        action: 'lot.created',
        subject_type: 'movement',
        subject_id: 'mov-receipt-001',
        correlation_id: 'corr-flow-001',
        causation_event_id: 'evt-doc-attach',
        justification: 'Lote digital de custódia gerado com saldo de 1.200 kg',
        previous_state: null,
        new_state: { lot_id: 'lot-pet-001', quantity_kg: 1200 },
        technical_context: {},
        occurred_at: '2026-09-16T10:10:00Z',
      },
    ]

    const queryMock = createQueryChain({ data: movementEvents, error: null })
    mocks.from.mockReturnValue(queryMock)

    const timeline = await getSubjectTimeline(scope, 'movement', 'mov-receipt-001')

    expect(timeline).toHaveLength(3)
    expect(timeline[0].action).toBe('movement.created')
    expect(timeline[1].action).toBe('evidence.created')
    expect(timeline[2].action).toBe('lot.created')
    expect(timeline[1].causationEventId).toBe('evt-mov-create')
    expect(timeline[2].causationEventId).toBe('evt-doc-attach')
    expect(timeline[0].correlationId).toBe('corr-flow-001')
  })

  it('coordinates end-to-end exception lifecycle across operator and independent auditor', async () => {
    // 1. Operator opens exception
    mocks.rpc.mockResolvedValueOnce({ data: 'exc-divergence-01', error: null })
    const excId = await openAuditException(scope, {
      subjectType: 'movement',
      subjectId: 'mov-receipt-001',
      justification: 'Divergência de 50 kg entre balança e nota fiscal',
      sourceEventId: 'evt-mov-create',
    })
    expect(excId).toBe('exc-divergence-01')

    // 2. Auditor claims the exception
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null })
    await claimAuditException(excId, 'Auditor assumiu para conferência do ticket de balança')
    expect(mocks.rpc).toHaveBeenCalledWith('claim_audit_exception', {
      p_exception_id: 'exc-divergence-01',
      p_justification: 'Auditor assumiu para conferência do ticket de balança',
    })

    // 3. Auditor resolves with justified result
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null })
    await resolveAuditException(excId, {
      result: 'justified',
      justification: 'Tara do veículo ajustada conforme laudo aferido',
    })
    expect(mocks.rpc).toHaveBeenCalledWith('resolve_audit_exception', {
      p_exception_id: 'exc-divergence-01',
      p_result: 'justified',
      p_justification: 'Tara do veículo ajustada conforme laudo aferido',
      p_corrective_event_id: null,
    })
  })

  it('guarantees bidirectional custody lineage between parent receipt lot and split sales lots', async () => {
    const parentLot = {
      id: 'lot-inbound-100',
      tenant_id: 'tenant-pilot-01',
      organization_id: 'org-coop-01',
      unit_id: 'unit-galpao-01',
      material_id: 'mat-aluminio',
      originated_quantity_kg: 1000,
      available_quantity_kg: 400,
      source_subject_id: 'mov-receipt-001',
      created_by: 'user-supervisor',
      created_at: '2026-09-16T08:00:00Z',
    }

    const childLot1 = {
      id: 'lot-sale-101',
      tenant_id: 'tenant-pilot-01',
      organization_id: 'org-coop-01',
      unit_id: 'unit-galpao-01',
      material_id: 'mat-aluminio',
      originated_quantity_kg: 600,
      available_quantity_kg: 0,
      source_subject_id: 'mov-sale-001',
      created_by: 'user-sales-lead',
      created_at: '2026-09-16T15:00:00Z',
    }

    const link = {
      id: 'link-split-01',
      tenant_id: 'tenant-pilot-01',
      organization_id: 'org-coop-01',
      unit_id: 'unit-galpao-01',
      parent_lot_id: 'lot-inbound-100',
      child_lot_id: 'lot-sale-101',
      relation_kind: 'split',
      quantity_kg: 600,
      created_at: '2026-09-16T15:00:00Z',
    }

    const mockRootLot = createQueryChain({ data: [parentLot], error: null })
    const mockLinks = createQueryChain({ data: [link], error: null })
    const mockRelatedLots = createQueryChain({ data: [parentLot, childLot1], error: null })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'custody_lots') {
        if (mockRootLot.select.mock.calls.length === 1) return mockRootLot
        return mockRelatedLots
      }
      if (table === 'custody_lot_links') return mockLinks
      throw new Error(`Unexpected table: ${table}`)
    })

    const chain = await getCustodyChain(scope, { type: 'lot', id: 'lot-inbound-100' })

    expect(chain.nodes).toHaveLength(2)
    expect(chain.links).toHaveLength(1)
    expect(chain.links[0]).toEqual({
      fromId: 'lot-inbound-100',
      toId: 'lot-sale-101',
      relationship: 'split',
      quantityKg: 600,
    })
  })
})
