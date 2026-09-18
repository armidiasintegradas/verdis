import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }))

import {
  claimAuditException,
  getCustodyChain,
  getSubjectTimeline,
  listAuditEvents,
  listAuditExceptions,
  openAuditException,
  reassignAuditException,
  resolveAuditException,
} from './audit-service'

const scope: ActiveScope = {
  tenantId: 'tenant-001',
  organizationId: 'org-001',
  unitId: 'unit-001',
}

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, any> = {}
  q.select = vi.fn(() => q)
  q.eq = vi.fn(() => q)
  q.is = vi.fn(() => q)
  q.in = vi.fn(() => q)
  q.gte = vi.fn(() => q)
  q.lte = vi.fn(() => q)
  q.or = vi.fn(() => q)
  q.order = vi.fn(async () => result)
  return q
}

beforeEach(() => vi.clearAllMocks())

describe('audit-service', () => {
  describe('listAuditEvents', () => {
    it('scopes queries by tenant and organization and maps audit event fields', async () => {
      const mockEvents = chain({
        data: [
          {
            id: 'evt-1',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            actor_user_id: 'user-001',
            action: 'lot.created',
            subject_type: 'custody_lot',
            subject_id: 'lot-001',
            correlation_id: 'corr-001',
            causation_event_id: null,
            justification: 'Origem lote',
            previous_state: null,
            new_state: { quantity_kg: 500 },
            technical_context: { ip: '127.0.0.1' },
            occurred_at: '2026-09-16T10:00:00Z',
          },
        ],
        error: null,
      })

      mocks.from.mockImplementation((table: string) => {
        if (table === 'audit_events') return mockEvents
        throw new Error(`Unexpected table ${table}`)
      })

      const events = await listAuditEvents(scope, {
        action: 'lot.created',
        subjectType: 'custody_lot',
      })

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        id: 'evt-1',
        action: 'lot.created',
        subjectType: 'custody_lot',
        subjectId: 'lot-001',
        justification: 'Origem lote',
      })
      expect(mockEvents.eq).toHaveBeenCalledWith('tenant_id', 'tenant-001')
      expect(mockEvents.eq).toHaveBeenCalledWith('organization_id', 'org-001')
      expect(mockEvents.eq).toHaveBeenCalledWith('action', 'lot.created')
      expect(mockEvents.eq).toHaveBeenCalledWith('subject_type', 'custody_lot')
    })

    it('propagates backend query errors as typed errors', async () => {
      const mockEvents = chain({
        data: null,
        error: new Error('Database connection failed'),
      })
      mocks.from.mockReturnValue(mockEvents)

      await expect(listAuditEvents(scope)).rejects.toThrow('Database connection failed')
    })
  })

  describe('getSubjectTimeline', () => {
    it('queries timeline by subject and returns events ordered chronologically', async () => {
      const mockEvents = chain({
        data: [
          {
            id: 'evt-1',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            actor_user_id: 'user-001',
            action: 'movement.created',
            subject_type: 'movement',
            subject_id: 'mov-100',
            correlation_id: null,
            causation_event_id: null,
            justification: null,
            previous_state: null,
            new_state: { status: 'draft' },
            technical_context: {},
            occurred_at: '2026-09-16T08:00:00Z',
          },
          {
            id: 'evt-2',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            actor_user_id: 'user-002',
            action: 'movement.posted',
            subject_type: 'movement',
            subject_id: 'mov-100',
            correlation_id: null,
            causation_event_id: 'evt-1',
            justification: 'Conferido com pesagem',
            previous_state: { status: 'draft' },
            new_state: { status: 'posted' },
            technical_context: {},
            occurred_at: '2026-09-16T09:00:00Z',
          },
        ],
        error: null,
      })
      mocks.from.mockReturnValue(mockEvents)

      const timeline = await getSubjectTimeline(scope, 'movement', 'mov-100')

      expect(timeline).toHaveLength(2)
      expect(timeline[0].action).toBe('movement.created')
      expect(timeline[1].action).toBe('movement.posted')
      expect(mockEvents.eq).toHaveBeenCalledWith('subject_type', 'movement')
      expect(mockEvents.eq).toHaveBeenCalledWith('subject_id', 'mov-100')
    })
  })

  describe('listAuditExceptions', () => {
    it('scopes exceptions and filters by state', async () => {
      const mockExceptions = chain({
        data: [
          {
            id: 'exc-1',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            subject_type: 'movement',
            subject_id: 'mov-100',
            source_event_id: 'evt-1',
            state: 'open',
            opened_at: '2026-09-16T10:00:00Z',
            opened_by_user_id: 'user-001',
            assigned_to_user_id: null,
            resolved_at: null,
            resolution_result: null,
            resolution_justification: null,
            corrective_event_id: null,
            updated_at: '2026-09-16T10:00:00Z',
          },
        ],
        error: null,
      })
      mocks.from.mockReturnValue(mockExceptions)

      const exceptions = await listAuditExceptions(scope, { state: 'open' })

      expect(exceptions).toHaveLength(1)
      expect(exceptions[0].state).toBe('open')
      expect(exceptions[0].openedByUserId).toBe('user-001')
      expect(mockExceptions.eq).toHaveBeenCalledWith('tenant_id', 'tenant-001')
      expect(mockExceptions.eq).toHaveBeenCalledWith('organization_id', 'org-001')
      expect(mockExceptions.eq).toHaveBeenCalledWith('state', 'open')
    })
  })

  describe('getCustodyChain', () => {
    it('assembles custody lot nodes and links recursively with cycle defense', async () => {
      const mockLots = chain({
        data: [
          {
            id: 'lot-child',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            material_id: 'mat-pet',
            originated_quantity_kg: 200,
            available_quantity_kg: 200,
            source_subject_id: null,
            created_by: 'user-001',
            created_at: '2026-09-16T11:00:00Z',
          },
          {
            id: 'lot-parent',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            material_id: 'mat-pet',
            originated_quantity_kg: 500,
            available_quantity_kg: 300,
            source_subject_id: null,
            created_by: 'user-001',
            created_at: '2026-09-16T09:00:00Z',
          },
        ],
        error: null,
      })

      const mockLinks = chain({
        data: [
          {
            id: 'link-1',
            tenant_id: 'tenant-001',
            organization_id: 'org-001',
            unit_id: 'unit-001',
            parent_lot_id: 'lot-parent',
            child_lot_id: 'lot-child',
            relation_kind: 'split',
            quantity_kg: 200,
            created_at: '2026-09-16T11:00:00Z',
          },
        ],
        error: null,
      })

      mocks.from.mockImplementation((table: string) => {
        if (table === 'custody_lots') return mockLots
        if (table === 'custody_lot_links') return mockLinks
        throw new Error(`Unexpected table ${table}`)
      })

      const chainResult = await getCustodyChain(scope, { type: 'lot', id: 'lot-child' })

      expect(chainResult.nodes).toHaveLength(2)
      expect(chainResult.links).toHaveLength(1)
      expect(chainResult.links[0]).toMatchObject({
        fromId: 'lot-parent',
        toId: 'lot-child',
        relationship: 'split',
        quantityKg: 200,
      })
    })

    it('throws typed error when requested root subject is not found', async () => {
      const mockLots = chain({ data: [], error: null })
      const mockLinks = chain({ data: [], error: null })
      mocks.from.mockImplementation((table: string) => {
        if (table === 'custody_lots') return mockLots
        if (table === 'custody_lot_links') return mockLinks
        throw new Error(`Unexpected table ${table}`)
      })

      await expect(
        getCustodyChain(scope, { type: 'lot', id: 'non-existent' }),
      ).rejects.toThrow('Lote de custódia non-existent não encontrado no escopo ativo.')
    })
  })

  describe('exception workflow RPCs', () => {
    it('calls open_audit_exception with scope and parameters', async () => {
      mocks.rpc.mockResolvedValue({ data: 'exc-new-id', error: null })

      const result = await openAuditException(scope, {
        subjectType: 'movement',
        subjectId: 'mov-123',
        justification: 'Discrepância na pesagem',
        sourceEventId: 'evt-456',
      })

      expect(result).toBe('exc-new-id')
      expect(mocks.rpc).toHaveBeenCalledWith('open_audit_exception', {
        p_tenant_id: 'tenant-001',
        p_organization_id: 'org-001',
        p_unit_id: 'unit-001',
        p_subject_type: 'movement',
        p_subject_id: 'mov-123',
        p_source_event_id: 'evt-456',
        p_justification: 'Discrepância na pesagem',
      })
    })

    it('calls claim_audit_exception with exception id and justification', async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: null })

      await claimAuditException('exc-123', 'Assumindo para validação')

      expect(mocks.rpc).toHaveBeenCalledWith('claim_audit_exception', {
        p_exception_id: 'exc-123',
        p_justification: 'Assumindo para validação',
      })
    })

    it('calls reassign_audit_exception with exception id, assignee and justification', async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: null })

      await reassignAuditException('exc-123', 'user-auditor-2', 'Redirecionando para especialista')

      expect(mocks.rpc).toHaveBeenCalledWith('reassign_audit_exception', {
        p_exception_id: 'exc-123',
        p_assignee_user_id: 'user-auditor-2',
        p_justification: 'Redirecionando para especialista',
      })
    })

    it('calls resolve_audit_exception with result, justification and corrective event', async () => {
      mocks.rpc.mockResolvedValue({ data: null, error: null })

      await resolveAuditException('exc-123', {
        result: 'corrected',
        justification: 'Conferido e ajustado com ticket de balança avulso',
        correctiveEventId: 'evt-corrective-789',
      })

      expect(mocks.rpc).toHaveBeenCalledWith('resolve_audit_exception', {
        p_exception_id: 'exc-123',
        p_result: 'corrected',
        p_justification: 'Conferido e ajustado com ticket de balança avulso',
        p_corrective_event_id: 'evt-corrective-789',
      })
    })

    it('throws error when RPC returns an error', async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: new Error('segregation of duties: author cannot validate own critical action'),
      })

      await expect(
        resolveAuditException('exc-123', {
          result: 'justified',
          justification: 'Tudo certo',
        }),
      ).rejects.toThrow('segregation of duties: author cannot validate own critical action')
    })
  })
})

