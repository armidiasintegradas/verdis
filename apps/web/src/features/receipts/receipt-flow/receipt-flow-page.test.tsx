import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'
import { RouterProvider, useRouter } from '@/app/router'
import { matchReceiptFlowPath } from '@/app/routes'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const mocks = vi.hoisted(() => ({
  createReceiptDraft: vi.fn(),
  updateReceiptDraft: vi.fn(),
  getReceiptDraft: vi.fn(),
  uploadReceiptEvidence: vi.fn(),
  loadReceiptConference: vi.fn(),
  confirmReceipt: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => ({ activeScope: scope, loading: false, error: null }),
}))

vi.mock('@/services/receipts/receipt-draft-service', () => ({
  createReceiptDraft: mocks.createReceiptDraft,
  updateReceiptDraft: mocks.updateReceiptDraft,
  getReceiptDraft: mocks.getReceiptDraft,
}))

vi.mock('@/services/documents/upload-receipt-evidence', () => ({
  uploadReceiptEvidence: mocks.uploadReceiptEvidence,
}))

vi.mock('@/services/receipts/receipt-conference-service', () => ({
  loadReceiptConference: mocks.loadReceiptConference,
}))

vi.mock('@/services/receipts/confirm-receipt-service', () => ({
  confirmReceipt: mocks.confirmReceipt,
}))

import { ReceiptFlowPage } from './receipt-flow-page'

const movementId = '60000000-0000-4000-8000-000000000001'
const evidenceId = '80000000-0000-4000-8000-000000000001'

function LocationProbe() {
  const { pathname, search } = useRouter()
  return <output data-testid="location">{pathname + search}</output>
}

function FlowHarness() {
  const { pathname } = useRouter()
  const match = matchReceiptFlowPath(pathname)
  if (!match) return null
  return (
    <>
      <LocationProbe />
      <ReceiptFlowPage movementId={match.movementId} />
    </>
  )
}

function renderFlow(path: string) {
  return render(
    <RouterProvider initialPath={path}>
      <FlowHarness />
    </RouterProvider>,
  )
}

function fillData() {
  fireEvent.change(screen.getByLabelText('Origem'), { target: { value: 'Empresa Demo' } })
  fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'Papelão Ondulado' } })
  fireEvent.change(screen.getByLabelText('Peso/quantidade'), { target: { value: '480' } })
  fireEvent.change(screen.getByLabelText('Data e hora'), {
    target: { value: '2026-09-15T18:20' },
  })
}

function draft(status: 'draft' | 'posted' = 'draft') {
  return {
    id: movementId,
    materialId: 'Papelão Ondulado',
    quantityKg: 480,
    occurredAt: '2026-09-15T21:20:00.000Z',
    sourceCounterpartyId: 'Empresa Demo',
    status,
  }
}

function processingConference() {
  return {
    movementId,
    registeredQuantityKg: 480,
    documentQuantityKg: null,
    state: 'processing' as const,
    differenceKg: null,
    differencePercent: null,
    evidenceId,
    document: {
      id: 'document-id',
      filename: 'Ticket_009182.jpg',
      extractionStatus: 'pending' as const,
    },
  }
}

function divergenceConference() {
  return {
    ...processingConference(),
    documentQuantityKg: 482,
    state: 'divergence' as const,
    differenceKg: 2,
    differencePercent: 0.4166666667,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createReceiptDraft.mockResolvedValue({ id: movementId })
  mocks.updateReceiptDraft.mockResolvedValue(undefined)
  mocks.getReceiptDraft.mockResolvedValue(draft())
  mocks.uploadReceiptEvidence.mockResolvedValue({
    documentId: 'document-id',
    evidenceId,
    originalFilename: 'Ticket_009182.jpg',
  })
  mocks.loadReceiptConference.mockResolvedValue(processingConference())
  mocks.confirmReceipt.mockResolvedValue({
    movementId,
    adoptedQuantityKg: 480,
    previousStockKg: 7940,
    newStockKg: 8420,
  })
})

describe('ReceiptFlowPage', () => {
  it('starts at Dados from /recebimentos/novo?step=dados', () => {
    renderFlow('/recebimentos/novo?step=dados')
    expect(screen.getByRole('heading', { name: 'Dados do recebimento' })).toBeInTheDocument()
  })

  it('creates a draft on first Dados continue and navigates to movement comprovacao', async () => {
    renderFlow('/recebimentos/novo?step=dados')
    fillData()
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }))

    await waitFor(() => {
      expect(mocks.createReceiptDraft).toHaveBeenCalled()
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/recebimentos/novo/${movementId}?step=comprovacao`,
      )
    })
  })

  it('keeps normal CONTINUAR disabled after file selection until upload succeeds', async () => {
    renderFlow(`/recebimentos/novo/${movementId}?step=comprovacao`)
    await screen.findByRole('heading', { name: 'Comprovação' })

    const file = new File(['ticket'], 'Ticket_009182.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Enviar arquivo'), { target: { files: [file] } })

    expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'ENVIAR DOCUMENTO' }))

    await waitFor(() => expect(mocks.uploadReceiptEvidence).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeEnabled())
  })

  it('keeps draft values after upload failure', async () => {
    mocks.uploadReceiptEvidence.mockRejectedValue(new Error('upload failed'))
    renderFlow(`/recebimentos/novo/${movementId}?step=comprovacao`)
    await screen.findByRole('heading', { name: 'Comprovação' })

    const file = new File(['ticket'], 'Ticket_009182.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Enviar arquivo'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'ENVIAR DOCUMENTO' }))

    expect(await screen.findByText('Falha no envio')).toBeInTheDocument()
    expect(screen.getByText('480 kg')).toBeInTheDocument()
  })

  it('allows CONTINUAR SEM DOCUMENTO to conference', async () => {
    mocks.loadReceiptConference.mockResolvedValue({
      ...processingConference(),
      evidenceId: null,
      document: null,
    })
    renderFlow(`/recebimentos/novo/${movementId}?step=comprovacao`)
    await screen.findByRole('heading', { name: 'Comprovação' })

    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR SEM DOCUMENTO' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('?step=conferencia')
    })
  })

  it('shows only registered values while extraction is processing', async () => {
    renderFlow(`/recebimentos/novo/${movementId}?step=conferencia`)

    expect(await screen.findByText('Informado')).toBeInTheDocument()
    expect(screen.getByText('480 kg')).toBeInTheDocument()
    expect(screen.queryByText('Documento 482 kg')).not.toBeInTheDocument()
  })

  it('renders 480 vs 482 with no decision preselected', async () => {
    mocks.loadReceiptConference.mockResolvedValue(divergenceConference())
    renderFlow(`/recebimentos/novo/${movementId}?step=conferencia`)

    expect(await screen.findByText('Documento 482 kg')).toBeInTheDocument()
    expect(screen.getByText(/\+2 kg/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'USAR 482 KG' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'MANTER 480 KG' })).not.toBeChecked()
  })

  it('requires nonblank justification for keep_registered', async () => {
    mocks.loadReceiptConference.mockResolvedValue(divergenceConference())
    renderFlow(`/recebimentos/novo/${movementId}?step=conferencia`)

    fireEvent.click(await screen.findByRole('radio', { name: 'MANTER 480 KG' }))
    const confirm = screen.getByRole('button', { name: 'CONFIRMAR RECEBIMENTO' })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Justificativa'), { target: { value: '   ' } })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Justificativa'), {
      target: { value: 'Quantidade operacional confirmada.' },
    })
    expect(confirm).toBeEnabled()
  })

  it('allows use_document without justification', async () => {
    mocks.loadReceiptConference.mockResolvedValue(divergenceConference())
    renderFlow(`/recebimentos/novo/${movementId}?step=conferencia`)

    fireEvent.click(await screen.findByRole('radio', { name: 'USAR 482 KG' }))
    expect(screen.queryByLabelText('Justificativa')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CONFIRMAR RECEBIMENTO' })).toBeEnabled()
  })

  it('renders previous stock + adopted quantity = new stock after confirmation', async () => {
    mocks.loadReceiptConference.mockResolvedValue(divergenceConference())
    renderFlow(`/recebimentos/novo/${movementId}?step=conferencia`)

    fireEvent.click(await screen.findByRole('radio', { name: 'MANTER 480 KG' }))
    fireEvent.change(screen.getByLabelText('Justificativa'), {
      target: { value: 'Quantidade operacional confirmada.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR RECEBIMENTO' }))

    expect(await screen.findByRole('heading', { name: 'Recebimento concluído' })).toBeInTheDocument()
    expect(screen.getByText('7.940 kg')).toBeInTheDocument()
    expect(screen.getByText('+480 kg')).toBeInTheDocument()
    expect(screen.getByText('8.420 kg')).toBeInTheDocument()
  })

  it('forces posted movement to Concluir even if query asks for dados', async () => {
    mocks.getReceiptDraft.mockResolvedValue(draft('posted'))
    renderFlow(`/recebimentos/novo/${movementId}?step=dados`)

    expect(await screen.findByRole('heading', { name: 'Recebimento concluído' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dados do recebimento' })).not.toBeInTheDocument()
  })
})
