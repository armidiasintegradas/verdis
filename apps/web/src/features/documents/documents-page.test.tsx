import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterProvider, useRouter } from '@/app/router'
import type { ActiveScope } from '@/domain/scope'

const scope: ActiveScope = {
  tenantId: 'tenant-id',
  organizationId: 'org-id',
  unitId: 'unit-id',
}

const mocks = vi.hoisted(() => ({ loadDocuments: vi.fn() }))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => ({ activeScope: scope, loading: false, error: null }),
}))
vi.mock('@/services/documents/documents-query-service', () => ({
  loadDocuments: mocks.loadDocuments,
}))

import { DocumentsPage } from './documents-page'

const items = [
  {
    documentId: 'processing-doc', movementId: 'sale-processing', origin: 'sale' as const,
    filename: 'Venda_processando.pdf', mimeType: 'application/pdf', occurredAt: '2026-09-16T12:00:00Z',
    materialId: 'pet', materialLabel: 'PET', extractionState: 'processing' as const, reviewState: 'none' as const, movementLabel: 'Venda',
  },
  {
    documentId: 'resolved-doc', movementId: 'receipt-resolved', origin: 'receipt' as const,
    filename: 'Recebimento_resolvido.pdf', mimeType: 'application/pdf', occurredAt: '2026-09-16T11:00:00Z',
    materialId: 'paper', materialLabel: 'Papelão', extractionState: 'processed' as const, reviewState: 'resolved' as const, movementLabel: 'Recebimento',
  },
  {
    documentId: 'review-doc', movementId: 'receipt-review', origin: 'receipt' as const,
    filename: 'Recebimento_revisao.pdf', mimeType: 'application/pdf', occurredAt: '2026-09-16T10:00:00Z',
    materialId: 'paper', materialLabel: 'Papelão', extractionState: 'processed' as const, reviewState: 'required' as const, movementLabel: 'Recebimento',
  },
  {
    documentId: 'failed-doc', movementId: 'sale-failed', origin: 'sale' as const,
    filename: 'Venda_falha.pdf', mimeType: 'application/pdf', occurredAt: '2026-09-16T09:00:00Z',
    materialId: 'pet', materialLabel: 'PET', extractionState: 'failed' as const, reviewState: 'none' as const, movementLabel: 'Venda',
  },
]

function LocationProbe() {
  const { pathname, search } = useRouter()
  return <output data-testid="location">{pathname + search}</output>
}

function renderPage() {
  return render(
    <RouterProvider initialPath="/documentos">
      <LocationProbe />
      <DocumentsPage />
    </RouterProvider>,
  )
}

function metricValue(label: string) {
  const labelNode = screen.getByText(label, { selector: '.v-metric-card__label' })
  const card = labelNode.closest('.v-metric-card')
  expect(card).not.toBeNull()
  return within(card as HTMLElement).getByText(/^\d+$/).textContent
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.loadDocuments.mockResolvedValue(items)
})

describe('DocumentsPage', () => {
  it('loads durable scoped documents and derives metrics without treating processing as review work', async () => {
    renderPage()
    expect(await screen.findByText('Venda_processando.pdf')).toBeInTheDocument()
    expect(mocks.loadDocuments).toHaveBeenCalledWith(scope)

    expect(metricValue('Documentos vinculados')).toBe('4')
    expect(metricValue('Processados')).toBe('2')
    expect(metricValue('Processando')).toBe('1')
    expect(metricValue('Requer revisão')).toBe('1')

    expect(screen.getByText('Processando', { selector: '.v-status-badge' })).toBeInTheDocument()
    expect(screen.getByText('Requer revisão', { selector: '.v-status-badge' })).toBeInTheDocument()
    expect(screen.getByText('Falha de processamento', { selector: '.v-status-badge' })).toBeInTheDocument()
  })

  it('opens a durable document detail and returns to the owning movement route', async () => {
    renderPage()
    const processingTitle = await screen.findByText('Venda_processando.pdf')
    const saleRow = processingTitle.closest('article')
    expect(saleRow).not.toBeNull()

    fireEvent.click(within(saleRow as HTMLElement).getByRole('button', { name: 'VISUALIZAR' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/documentos/processing-doc')

    fireEvent.click(within(saleRow as HTMLElement).getByRole('button', { name: /ABRIR MOVIMENTAÇÃO/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/vendas/nova/sale-processing?step=concluir')
  })

  it('filters the durable list and clears filters', async () => {
    renderPage()
    await screen.findByText('Venda_processando.pdf')
    fireEvent.change(screen.getByLabelText('Buscar documento'), { target: { value: 'revisao' } })
    expect(screen.getByText('Recebimento_revisao.pdf')).toBeInTheDocument()
    expect(screen.queryByText('Venda_processando.pdf')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByText('Venda_processando.pdf')).toBeInTheDocument()
  })

  it('shows the durable empty state without demo counts', async () => {
    mocks.loadDocuments.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('Nenhum documento vinculado neste contexto.')).toBeInTheDocument()
    expect(screen.getByText('Os documentos enviados em Recebimentos e Vendas aparecerão aqui.')).toBeInTheDocument()
    expect(screen.queryByText('4 documentos')).not.toBeInTheDocument()
  })

  it('shows a recoverable scoped load error and never falls back to demo data', async () => {
    mocks.loadDocuments.mockRejectedValue(new Error('network'))
    renderPage()
    expect(await screen.findByText('Não foi possível carregar os documentos deste contexto.')).toBeInTheDocument()
    await waitFor(() => expect(mocks.loadDocuments).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Documento_Venda_1279.pdf')).not.toBeInTheDocument()
  })
})
