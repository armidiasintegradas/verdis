import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ActiveScope } from '@/domain/scope'
import { RouterProvider } from '@/app/router'

const mockScope: ActiveScope = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
}

const mocks = vi.hoisted(() => ({
  useScope: vi.fn(),
  listAuditEvents: vi.fn(),
  listAuditExceptions: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => mocks.useScope(),
}))

vi.mock('./audit-service', () => ({
  listAuditEvents: (...args: any[]) => mocks.listAuditEvents(...args),
  listAuditExceptions: (...args: any[]) => mocks.listAuditExceptions(...args),
}))

import { AuditCenterPage } from './audit-center-page'

function renderPage() {
  return render(
    <RouterProvider initialPath="/auditoria">
      <AuditCenterPage />
    </RouterProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useScope.mockReturnValue({
    activeScope: mockScope,
    loading: false,
    error: null,
  })
  mocks.listAuditExceptions.mockResolvedValue([])
})

describe('AuditCenterPage', () => {
  it('renders loading indicator while loading audit events', () => {
    mocks.listAuditEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Carregando Centro de Auditoria...')).toBeDefined()
  })

  it('renders error notice when audit service fails', async () => {
    mocks.listAuditEvents.mockRejectedValue(new Error('Network failure'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar o Centro de Auditoria deste contexto.')).toBeDefined()
    })
  })

  it('renders empty notice when no events exist', async () => {
    mocks.listAuditEvents.mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Nenhum evento probatório encontrado para os filtros selecionados.')).toBeDefined()
    })
  })

  it('renders audit events table with action, entity, actor and justification', async () => {
    mocks.listAuditEvents.mockResolvedValue([
      {
        id: 'evt-101',
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        unitId: 'unit-1',
        actorUserId: 'user-001',
        action: 'lot.created',
        subjectType: 'custody_lot',
        subjectId: 'lot-uuid-1',
        correlationId: null,
        causationEventId: null,
        justification: 'Lote criado a partir de triagem',
        previousState: null,
        newState: { quantity_kg: 350 },
        technicalContext: {},
        occurredAt: '2026-09-16T10:30:00Z',
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Centro de Auditoria')).toBeDefined()
    })

    const eventRow = screen.getByTestId('event-row-evt-101')
    expect(eventRow).toBeDefined()
    expect(eventRow.textContent).toContain('lot.created')
    expect(eventRow.textContent).toContain('custody_lot')
    expect(eventRow.textContent).toContain('Lote criado a partir de triagem')
    expect(eventRow.textContent).toContain('user-001')
  })

  it('reloads events with filter parameters when filter changes', async () => {
    mocks.listAuditEvents.mockResolvedValue([])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Centro de Auditoria')).toBeDefined()
    })

    const actionSelect = screen.getByLabelText('Ação')
    fireEvent.change(actionSelect, { target: { value: 'lot.created' } })

    await waitFor(() => {
      expect(mocks.listAuditEvents).toHaveBeenCalledWith(
        mockScope,
        expect.objectContaining({ action: 'lot.created' }),
      )
    })
  })
})
