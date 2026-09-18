import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ActiveScope } from '@/domain/scope'
import type { CustodyChainResult } from './types'

const mockScope: ActiveScope = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
}

const mocks = vi.hoisted(() => ({
  useScope: vi.fn(),
  getCustodyChain: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => mocks.useScope(),
}))

vi.mock('./audit-service', () => ({
  getCustodyChain: (...args: any[]) => mocks.getCustodyChain(...args),
}))

import { CustodyChain } from './custody-chain'

const mockChainData: CustodyChainResult = {
  rootSubject: { type: 'lot', id: 'lot-target' },
  nodes: [
    {
      id: 'lot-parent',
      type: 'lot',
      label: 'Lote lot-pare',
      details: {
        materialId: 'mat-pet',
        originatedQuantityKg: 500,
        availableQuantityKg: 200,
      },
      occurredAt: '2026-09-16T08:00:00Z',
    },
    {
      id: 'lot-target',
      type: 'lot',
      label: 'Lote lot-targ',
      details: {
        materialId: 'mat-pet',
        originatedQuantityKg: 300,
        availableQuantityKg: 300,
      },
      occurredAt: '2026-09-16T10:00:00Z',
    },
    {
      id: 'lot-child',
      type: 'lot',
      label: 'Lote lot-chil',
      details: {
        materialId: 'mat-pet-fardo',
        originatedQuantityKg: 150,
        availableQuantityKg: 150,
      },
      occurredAt: '2026-09-16T14:00:00Z',
    },
  ],
  links: [
    {
      fromId: 'lot-parent',
      toId: 'lot-target',
      relationship: 'split',
      quantityKg: 300,
    },
    {
      fromId: 'lot-target',
      toId: 'lot-child',
      relationship: 'split',
      quantityKg: 150,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useScope.mockReturnValue({
    activeScope: mockScope,
    loading: false,
    error: null,
  })
})

describe('CustodyChain', () => {
  it('renders prompt when no lot is specified', () => {
    render(<CustodyChain />)
    expect(screen.getByText('Insira o ID de um lote para rastrear a cadeia de custódia.')).toBeDefined()
  })

  it('renders loading state when initialLotId is provided', () => {
    mocks.getCustodyChain.mockReturnValue(new Promise(() => {}))
    render(<CustodyChain initialLotId="lot-target" />)
    expect(screen.getByText('Carregando cadeia de custódia...')).toBeDefined()
  })

  it('renders error notice when getCustodyChain fails', async () => {
    mocks.getCustodyChain.mockRejectedValue(new Error('Lote não encontrado'))
    render(<CustodyChain initialLotId="lot-target" />)
    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar a cadeia de custódia: Lote não encontrado')).toBeDefined()
    })
  })

  it('renders bidirectional custody nodes, parents, and child derivations', async () => {
    mocks.getCustodyChain.mockResolvedValue(mockChainData)
    render(<CustodyChain initialLotId="lot-target" />)

    await waitFor(() => {
      expect(screen.getByText('Cadeia de Custódia Digital')).toBeDefined()
    })

    expect(screen.getByText('Genealogia Bidirecional')).toBeDefined()
    // Target lot details
    expect(screen.getByTestId('node-lot-target')).toBeDefined()
    // Parent origin
    expect(screen.getByTestId('node-lot-parent')).toBeDefined()
    // Child derivation
    expect(screen.getByTestId('node-lot-child')).toBeDefined()

    // Upstream and downstream links
    expect(screen.getByText('Origens Ancestrais (Upstream)')).toBeDefined()
    expect(screen.getByText('Derivações Subsequentes (Downstream)')).toBeDefined()
    expect(screen.getAllByText(/split/).length).toBeGreaterThan(0)
  })

  it('allows user to query custody chain by entering a lot ID', async () => {
    mocks.getCustodyChain.mockResolvedValue(mockChainData)
    render(<CustodyChain />)

    const input = screen.getByPlaceholderText('Digite o UUID do lote...')
    fireEvent.change(input, { target: { value: 'lot-target' } })

    const searchBtn = screen.getByRole('button', { name: 'Rastrear' })
    fireEvent.click(searchBtn)

    await waitFor(() => {
      expect(mocks.getCustodyChain).toHaveBeenCalledWith(mockScope, {
        type: 'lot',
        id: 'lot-target',
      })
    })
  })
})
