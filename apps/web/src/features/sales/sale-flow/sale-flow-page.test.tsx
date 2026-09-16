import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'
import { RouterProvider, useRouter } from '@/app/router'
import { matchSaleFlowPath } from '@/app/routes'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const buyerId = '26000000-0000-4000-8000-000000000001'
const materialId = '25000000-0000-4000-8000-000000000001'

const mocks = vi.hoisted(() => ({
  createSaleDraft: vi.fn(),
  updateSaleDraft: vi.fn(),
  getSaleDraft: vi.fn(),
  loadSaleFormOptions: vi.fn(),
  uploadSaleEvidence: vi.fn(),
  loadSaleConference: vi.fn(),
  confirmSale: vi.fn(),
  loadSaleCompletion: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => ({ activeScope: scope, loading: false, error: null }),
}))
vi.mock('@/services/sales/sale-draft-service', () => ({
  createSaleDraft: mocks.createSaleDraft,
  updateSaleDraft: mocks.updateSaleDraft,
  getSaleDraft: mocks.getSaleDraft,
}))
vi.mock('@/services/sales/sale-form-options-service', () => ({
  loadSaleFormOptions: mocks.loadSaleFormOptions,
}))
vi.mock('@/services/documents/upload-sale-evidence', () => ({ uploadSaleEvidence: mocks.uploadSaleEvidence }))
vi.mock('@/services/sales/sale-conference-service', () => ({ loadSaleConference: mocks.loadSaleConference }))
vi.mock('@/services/sales/confirm-sale-service', () => ({ confirmSale: mocks.confirmSale }))
vi.mock('@/services/sales/sale-completion-service', () => ({ loadSaleCompletion: mocks.loadSaleCompletion }))

import { SaleFlowPage } from './sale-flow-page'

const movementId = '60000000-0000-4000-8000-000000000001'
const evidenceId = '80000000-0000-4000-8000-000000000001'

function LocationProbe() {
  const { pathname, search } = useRouter()
  return <output data-testid="location">{pathname + search}</output>
}

function FlowHarness() {
  const { pathname } = useRouter()
  const match = matchSaleFlowPath(pathname)
  if (!match) return null
  return <><LocationProbe /><SaleFlowPage movementId={match.movementId} /></>
}

function renderFlow(path: string) {
  return render(<RouterProvider initialPath={path}><FlowHarness /></RouterProvider>)
}

function expectPageText(text: string) {
  expect(document.body.textContent?.replace(/\s+/g, ' ')).toContain(text)
}

function fillData(overrides: { quantity?: string; price?: string } = {}) {
  fireEvent.change(screen.getByLabelText('Comprador'), { target: { value: buyerId } })
  fireEvent.change(screen.getByLabelText('Material'), { target: { value: materialId } })
  fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: overrides.quantity ?? '1000' } })
  fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: overrides.price ?? '3.10' } })
  fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-09-15T18:35' } })
}

function draft(status: 'draft' | 'posted' = 'draft', availableStockKg = 3200) {
  return {
    movementId,
    saleId: 'sale-id',
    status,
    buyerCounterpartyId: buyerId,
    materialId,
    quantityKg: 1000,
    unitPrice: 3.1,
    totalAmount: 3100,
    soldAt: '2026-09-15T21:35:00.000Z',
    availableStockKg,
  }
}

function registeredOnlyConference() {
  return {
    movementId,
    state: 'registered_only' as const,
    registered: { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
    documentary: null,
    differences: null,
    evidenceId: null,
    document: null,
  }
}

function processingConference() {
  return {
    movementId,
    state: 'processing' as const,
    registered: { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
    documentary: null,
    differences: null,
    evidenceId,
    document: { id: 'document-id', filename: 'Documento_Venda_1279.pdf', extractionStatus: 'pending' as const },
  }
}

function divergenceConference() {
  return {
    ...processingConference(),
    state: 'divergence' as const,
    documentary: { quantityKg: 1000, unitPrice: 3.2, totalAmount: 3200 },
    differences: {
      unitPriceDifference: 0.1,
      registeredTotal: 3100,
      documentTotal: 3200,
      totalDifference: 100,
      percent: 3.2258064516,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createSaleDraft.mockResolvedValue({ movementId, saleId: 'sale-id', totalAmount: 3100 })
  mocks.updateSaleDraft.mockResolvedValue({ movementId, saleId: 'sale-id', totalAmount: 3100 })
  mocks.getSaleDraft.mockResolvedValue(draft())
  mocks.loadSaleFormOptions.mockResolvedValue({
    buyers: [{ id: buyerId, label: 'Comprador Demo' }],
    materials: [{ id: materialId, code: 'PET', label: 'PET', availableStockKg: 3200 }],
  })
  mocks.uploadSaleEvidence.mockResolvedValue({ documentId: 'document-id', evidenceId, originalFilename: 'Documento_Venda_1279.pdf' })
  mocks.loadSaleConference.mockResolvedValue(registeredOnlyConference())
  mocks.confirmSale.mockResolvedValue({
    movementId, saleId: 'sale-id', adoptedQuantityKg: 1000, adoptedUnitPrice: 3.1,
    adoptedTotalAmount: 3100, previousStockKg: 3200, newStockKg: 2200,
  })
  mocks.loadSaleCompletion.mockResolvedValue({
    movementId, saleId: 'sale-id', buyerCounterpartyId: 'Comprador Demo', materialId: 'PET',
    adoptedQuantityKg: 1000, adoptedUnitPrice: 3.1, adoptedTotalAmount: 3100,
    previousStockKg: 3200, newStockKg: 2200, decision: 'keep_registered',
    reason: 'Preço negociado confirmado.',
    document: { id: 'document-id', filename: 'Documento_Venda_1279.pdf', extractionStatus: 'accepted' },
  })
})

describe('SaleFlowPage', () => {
  it('starts at Dados', async () => {
    renderFlow('/vendas/nova?step=dados')
    expect(screen.getByRole('heading', { name: 'Dados da venda' })).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Comprador Demo' })
  })

  it('loads scoped buyer/material choices and projects stock before creating the first draft', async () => {
    renderFlow('/vendas/nova?step=dados')

    await screen.findByRole('option', { name: 'Comprador Demo' })
    const buyer = screen.getByRole('combobox', { name: 'Comprador' })
    const material = screen.getByRole('combobox', { name: 'Material' })
    fireEvent.change(buyer, { target: { value: buyerId } })
    fireEvent.change(material, { target: { value: materialId } })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '3.10' } })
    fireEvent.change(screen.getByLabelText('Data e hora'), { target: { value: '2026-09-15T18:35' } })

    expect(screen.getByText('Saldo atual').parentElement).toHaveTextContent('3.200 kg')
    expect(screen.getByText('Saldo após venda').parentElement).toHaveTextContent('2.200 kg')

    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }))
    await waitFor(() => expect(mocks.createSaleDraft).toHaveBeenCalledWith(scope, expect.objectContaining({
      buyerCounterpartyId: buyerId,
      materialId,
      quantityKg: 1000,
      unitPrice: 3.1,
    })))
  })

  it('shows canonical total and stock projection and creates the draft', async () => {
    renderFlow('/vendas/nova?step=dados')
    await screen.findByRole('option', { name: 'Comprador Demo' })
    fillData()
    expectPageText('R$ 3.100,00')
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }))
    await waitFor(() => expect(mocks.createSaleDraft).toHaveBeenCalled())
    expect(screen.getByTestId('location')).toHaveTextContent(`/vendas/nova/${movementId}?step=comprovacao`)
  })

  it('shows R$ 1.240 and Indisponível and disables continue for 320/400', async () => {
    mocks.getSaleDraft.mockResolvedValue(draft('draft', 320))
    renderFlow(`/vendas/nova/${movementId}?step=dados`)
    await screen.findByRole('heading', { name: 'Dados da venda' })
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '400' } })
    expectPageText('R$ 1.240,00')
    expect(screen.getByText('Indisponível')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeDisabled()
  })

  it('requires upload success before normal continue and then exposes document viewing', async () => {
    renderFlow(`/vendas/nova/${movementId}?step=comprovacao`)
    await screen.findByRole('heading', { name: 'Comprovação' })
    const file = new File(['sale'], 'Documento_Venda_1279.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Enviar arquivo'), { target: { files: [file] } })
    expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'ENVIAR DOCUMENTO' }))
    await screen.findByRole('button', { name: 'VISUALIZAR DOCUMENTO' })
    expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeEnabled()
  })

  it('allows conference while the document is processing using registered values', async () => {
    mocks.loadSaleConference.mockResolvedValue(processingConference())
    renderFlow(`/vendas/nova/${movementId}?step=conferencia`)
    expect(await screen.findByText('Documento em processamento')).toBeInTheDocument()
    expectPageText('R$ 3,10/kg')
    expect(screen.getByRole('button', { name: 'CONFIRMAR VENDA' })).toBeEnabled()
  })

  it('shows Dados coincidentes for a matching extraction', async () => {
    mocks.loadSaleConference.mockResolvedValue({
      ...processingConference(), state: 'match',
      documentary: { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
      differences: { unitPriceDifference: 0, registeredTotal: 3100, documentTotal: 3100, totalDifference: 0, percent: 0 },
    })
    renderFlow(`/vendas/nova/${movementId}?step=conferencia`)
    expect(await screen.findByText('Dados coincidentes')).toBeInTheDocument()
  })

  it('renders 3.10 vs 3.20 divergence with no decision preselected', async () => {
    mocks.loadSaleConference.mockResolvedValue(divergenceConference())
    renderFlow(`/vendas/nova/${movementId}?step=conferencia`)
    await screen.findByText('Divergência comercial')
    expectPageText('R$ 3,20/kg')
    expectPageText('+R$ 100,00')
    expectPageText('+3,23%')
    expect(screen.getByRole('radio', { name: 'USAR VALORES DO DOCUMENTO' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'MANTER VALORES REGISTRADOS' })).not.toBeChecked()
  })

  it('requires nonblank justification for keep_registered', async () => {
    mocks.loadSaleConference.mockResolvedValue(divergenceConference())
    renderFlow(`/vendas/nova/${movementId}?step=conferencia`)
    fireEvent.click(await screen.findByRole('radio', { name: 'MANTER VALORES REGISTRADOS' }))
    const confirm = screen.getByRole('button', { name: 'CONFIRMAR VENDA' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Justificativa'), { target: { value: 'Preço negociado confirmado.' } })
    expect(confirm).toBeEnabled()
  })

  it('renders canonical completion 3200 - 1000 = 2200 after keep_registered', async () => {
    mocks.loadSaleConference.mockResolvedValue(divergenceConference())
    renderFlow(`/vendas/nova/${movementId}?step=conferencia`)
    fireEvent.click(await screen.findByRole('radio', { name: 'MANTER VALORES REGISTRADOS' }))
    fireEvent.change(screen.getByLabelText('Justificativa'), { target: { value: 'Preço negociado confirmado.' } })
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR VENDA' }))
    expect(await screen.findByRole('heading', { name: 'Venda concluída' })).toBeInTheDocument()
    expect(screen.getByText('3.200 kg')).toBeInTheDocument()
    expect(screen.getByText('-1.000 kg')).toBeInTheDocument()
    expect(screen.getByText('2.200 kg')).toBeInTheDocument()
    expectPageText('R$ 3.100,00')
  })

  it('forces a posted sale to Concluir and loads durable completion after refresh', async () => {
    mocks.getSaleDraft.mockResolvedValue(draft('posted'))
    renderFlow(`/vendas/nova/${movementId}?step=dados`)
    expect(await screen.findByRole('heading', { name: 'Venda concluída' })).toBeInTheDocument()
    await waitFor(() => expect(mocks.loadSaleCompletion).toHaveBeenCalledWith(movementId, scope))
    expect(screen.getByText('Documento_Venda_1279.pdf')).toBeInTheDocument()
    expect(screen.getByText('Mantidos valores registrados')).toBeInTheDocument()
  })
})
