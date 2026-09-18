import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ActiveScope } from '@/domain/scope'

const mockScope: ActiveScope = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
}

const mocks = vi.hoisted(() => ({
  useScope: vi.fn(),
  getSubjectTimeline: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => mocks.useScope(),
}))

vi.mock('./audit-service', () => ({
  getSubjectTimeline: (...args: any[]) => mocks.getSubjectTimeline(...args),
}))

import { AuditTimeline } from './audit-timeline'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useScope.mockReturnValue({
    activeScope: mockScope,
    loading: false,
    error: null,
  })
})

describe('AuditTimeline', () => {
  it('renders loading indicator while fetching subject timeline', () => {
    mocks.getSubjectTimeline.mockReturnValue(new Promise(() => {}))
    render(<AuditTimeline subjectType="movement" subjectId="mov-1" />)
    expect(screen.getByText('Carregando linha do tempo probatória...')).toBeDefined()
  })

  it('renders error notice when timeline service fails', async () => {
    mocks.getSubjectTimeline.mockRejectedValue(new Error('Network failure'))
    render(<AuditTimeline subjectType="movement" subjectId="mov-1" />)
    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar o histórico de auditoria.')).toBeDefined()
    })
  })

  it('renders empty notice when no events are recorded', async () => {
    mocks.getSubjectTimeline.mockResolvedValue([])
    render(<AuditTimeline subjectType="movement" subjectId="mov-1" />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum evento registrado para esta entidade.')).toBeDefined()
    })
  })

  it('renders chronological evidentiary events with actor, action, and justification', async () => {
    mocks.getSubjectTimeline.mockResolvedValue([
      {
        id: 'evt-1',
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        unitId: 'unit-1',
        actorUserId: 'user-001',
        action: 'movement.created',
        subjectType: 'movement',
        subjectId: 'mov-1',
        correlationId: null,
        causationEventId: null,
        justification: null,
        previousState: null,
        newState: { status: 'draft', quantity_kg: 500 },
        technicalContext: {},
        occurredAt: '2026-09-16T08:00:00Z',
      },
      {
        id: 'evt-2',
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        unitId: 'unit-1',
        actorUserId: 'user-002',
        action: 'movement.posted',
        subjectType: 'movement',
        subjectId: 'mov-1',
        correlationId: null,
        causationEventId: 'evt-1',
        justification: 'Pesagem conferida com ticket balança',
        previousState: { status: 'draft' },
        newState: { status: 'posted' },
        technicalContext: {},
        occurredAt: '2026-09-16T09:00:00Z',
      },
    ])

    render(<AuditTimeline subjectType="movement" subjectId="mov-1" />)

    await waitFor(() => {
      expect(screen.getByText('Linha do Tempo Probatória')).toBeDefined()
    })

    expect(screen.getByText('movement.created')).toBeDefined()
    expect(screen.getByText('movement.posted')).toBeDefined()
    expect(screen.getByText('Pesagem conferida com ticket balança')).toBeDefined()
    expect(screen.getByText(/user-001/)).toBeDefined()
    expect(screen.getByText(/user-002/)).toBeDefined()
  })
})
