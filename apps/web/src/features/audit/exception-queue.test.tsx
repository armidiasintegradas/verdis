import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ActiveScope } from '@/domain/scope'
import type { AuditExceptionItem } from './types'

const mockScope: ActiveScope = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
}

const mocks = vi.hoisted(() => ({
  useScope: vi.fn(),
  listAuditExceptions: vi.fn(),
  claimAuditException: vi.fn(),
  resolveAuditException: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => mocks.useScope(),
}))

vi.mock('./audit-service', () => ({
  listAuditExceptions: (...args: any[]) => mocks.listAuditExceptions(...args),
  claimAuditException: (...args: any[]) => mocks.claimAuditException(...args),
  resolveAuditException: (...args: any[]) => mocks.resolveAuditException(...args),
}))

import { ExceptionQueue } from './exception-queue'

const baseException: AuditExceptionItem = {
  id: 'exc-1',
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
  subjectType: 'movement',
  subjectId: 'mov-100',
  sourceEventId: 'evt-10',
  state: 'open',
  openedAt: '2026-09-16T12:00:00Z',
  openedByUserId: 'user-operator-1',
  assignedToUserId: null,
  resolvedAt: null,
  resolutionResult: null,
  resolutionJustification: null,
  correctiveEventId: null,
  updatedAt: '2026-09-16T12:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useScope.mockReturnValue({
    activeScope: mockScope,
    loading: false,
    error: null,
  })
})

describe('ExceptionQueue', () => {
  it('renders loading state while fetching exceptions', () => {
    mocks.listAuditExceptions.mockReturnValue(new Promise(() => {}))
    render(<ExceptionQueue currentUserId="user-auditor-1" />)
    expect(screen.getByText('Carregando fila de exceções...')).toBeDefined()
  })

  it('renders empty notice when no exceptions are found', async () => {
    mocks.listAuditExceptions.mockResolvedValue([])
    render(<ExceptionQueue currentUserId="user-auditor-1" />)
    await waitFor(() => {
      expect(screen.getByText('Nenhuma exceção operacional encontrada.')).toBeDefined()
    })
  })

  it('renders list of exceptions with details', async () => {
    mocks.listAuditExceptions.mockResolvedValue([baseException])
    render(<ExceptionQueue currentUserId="user-auditor-1" />)

    await waitFor(() => {
      expect(screen.getByText('Fila de Exceções')).toBeDefined()
    })

    expect(screen.getByText('movement')).toBeDefined()
    expect(screen.getByText(/user-operator-1/)).toBeDefined()
    expect(screen.getByText('open')).toBeDefined()
  })

  it('claims an open exception with justification', async () => {
    mocks.listAuditExceptions.mockResolvedValue([baseException])
    mocks.claimAuditException.mockResolvedValue(undefined)

    render(<ExceptionQueue currentUserId="user-auditor-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Assumir Análise' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Assumir Análise' }))

    await waitFor(() => {
      expect(mocks.claimAuditException).toHaveBeenCalledWith(
        'exc-1',
        expect.stringContaining('Assumido para auditoria'),
      )
    })
  })

  it('enforces segregation of duties warning and disables resolution when current user is the author', async () => {
    mocks.listAuditExceptions.mockResolvedValue([
      {
        ...baseException,
        state: 'in_review',
        assignedToUserId: 'user-operator-1',
        openedByUserId: 'user-operator-1', // same user
      },
    ])

    render(<ExceptionQueue currentUserId="user-operator-1" />)

    await waitFor(() => {
      expect(screen.getByText('Fila de Exceções')).toBeDefined()
    })

    expect(screen.getByText(/Segregação de funções:/)).toBeDefined()
    const resolveBtn = screen.queryByRole('button', { name: 'Resolver' })
    expect(resolveBtn).toBeNull()
  })

  it('allows resolution with mandatory justification when user is an independent reviewer', async () => {
    mocks.listAuditExceptions.mockResolvedValue([
      {
        ...baseException,
        state: 'in_review',
        assignedToUserId: 'user-auditor-1',
        openedByUserId: 'user-operator-1', // different user
      },
    ])
    mocks.resolveAuditException.mockResolvedValue(undefined)

    render(<ExceptionQueue currentUserId="user-auditor-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resolver' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))

    const justificationInput = screen.getByLabelText('Justificativa da Resolução')
    fireEvent.change(justificationInput, { target: { value: 'Comprovante auditado e validado.' } })

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Resolução' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mocks.resolveAuditException).toHaveBeenCalledWith('exc-1', {
        result: 'justified',
        justification: 'Comprovante auditado e validado.',
        correctiveEventId: undefined,
      })
    })
  })
})
