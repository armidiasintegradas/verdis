import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'
import { RouterProvider, useRouter } from '@/app/router'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const movementId = '60000000-0000-4000-8000-000000000001'
const mocks = vi.hoisted(() => ({
  getReceiptDraft: vi.fn(),
  createReceiptDraft: vi.fn(),
  updateReceiptDraft: vi.fn(),
  uploadReceiptEvidence: vi.fn(),
  loadReceiptConference: vi.fn(),
  loadReceiptCompletion: vi.fn(),
  confirmReceipt: vi.fn(),
}))

vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => ({ activeScope: scope, loading: false, error: null }),
}))

vi.mock('@/services/receipts/receipt-draft-service', () => ({
  getReceiptDraft: mocks.getReceiptDraft,
  createReceiptDraft: mocks.createReceiptDraft,
  updateReceiptDraft: mocks.updateReceiptDraft,
}))

vi.mock('@/services/documents/upload-receipt-evidence', () => ({
  uploadReceiptEvidence: mocks.uploadReceiptEvidence,
}))

vi.mock('@/services/receipts/receipt-conference-service', () => ({
  loadReceiptConference: mocks.loadReceiptConference,
}))

vi.mock('@/services/receipts/receipt-completion-service', () => ({
  loadReceiptCompletion: mocks.loadReceiptCompletion,
}))

vi.mock('@/services/receipts/confirm-receipt-service', () => ({
  confirmReceipt: mocks.confirmReceipt,
}))

import { ReceiptFlowPage } from './receipt-flow-page'

function LocationProbe() {
  const { pathname, search } = useRouter()
  return <output data-testid="location">{pathname + search}</output>
}

function renderFlow(path: string) {
  return render(
    <RouterProvider initialPath={path}>
      <LocationProbe />
      <ReceiptFlowPage movementId={movementId} />
    </RouterProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createReceiptDraft.mockResolvedValue({ id: movementId })
  mocks.updateReceiptDraft.mockResolvedValue(undefined)
  mocks.confirmReceipt.mockResolvedValue({
    movementId,
    adoptedQuantityKg: 480,
    previousStockKg: 7940,
    newStockKg: 8420,
  })
  mocks.loadReceiptConference.mockResolvedValue({
    movementId,
    registeredQuantityKg: 480,
    documentQuantityKg: null,
    state: 'processing',
    differenceKg: null,
    differencePercent: null,
    evidenceId: 'evidence-id',
    document: {
      id: 'document-id',
      filename: 'Ticket_009182.jpg',
      extractionStatus: 'pending',
    },
  })
  mocks.uploadReceiptEvidence.mockResolvedValue({
    documentId: 'document-id',
    evidenceId: 'evidence-id',
    originalFilename: 'Ticket_009182.jpg',
  })
})

describe('ReceiptFlowPage durable completion', () => {
  it('reloads a posted receipt with stock equation, document, decision and justification from durable facts', async () => {
    mocks.getReceiptDraft.mockResolvedValue({
      id: movementId,
      materialId: 'Papelão Ondulado',
      quantityKg: 480,
      occurredAt: '2026-09-15T21:20:00.000Z',
      sourceCounterpartyId: 'Empresa Demo',
      status: 'posted',
    })
    mocks.loadReceiptCompletion.mockResolvedValue({
      movementId,
      adoptedQuantityKg: 480,
      previousStockKg: 7940,
      newStockKg: 8420,
      decision: 'keep_registered',
      reason: 'Quantidade operacional confirmada.',
      document: {
        id: 'document-id',
        filename: 'Ticket_009182.jpg',
        extractionStatus: 'accepted',
      },
    })

    renderFlow(`/recebimentos/novo/${movementId}?step=dados`)

    expect(await screen.findByRole('heading', { name: 'Recebimento concluído' })).toBeInTheDocument()
    expect(await screen.findByText('7.940 kg')).toBeInTheDocument()
    expect(screen.getByText('+480 kg')).toBeInTheDocument()
    expect(screen.getByText('8.420 kg')).toBeInTheDocument()
    expect(screen.getByText('Ticket_009182.jpg')).toBeInTheDocument()
    expect(screen.getByText('Mantidos valores registrados')).toBeInTheDocument()
    expect(screen.getByText('Quantidade operacional confirmada.')).toBeInTheDocument()
  })

  it('offers VISUALIZAR DOCUMENTO after upload and routes to the uploaded document context', async () => {
    mocks.getReceiptDraft.mockResolvedValue({
      id: movementId,
      materialId: 'Papelão Ondulado',
      quantityKg: 480,
      occurredAt: '2026-09-15T21:20:00.000Z',
      sourceCounterpartyId: 'Empresa Demo',
      status: 'draft',
    })

    renderFlow(`/recebimentos/novo/${movementId}?step=comprovacao`)
    await screen.findByRole('heading', { name: 'Comprovação' })

    const file = new File(['ticket'], 'Ticket_009182.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Enviar arquivo'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'ENVIAR DOCUMENTO' }))

    const viewDocument = await screen.findByRole('button', { name: 'VISUALIZAR DOCUMENTO' })
    fireEvent.click(viewDocument)

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/documentos?document=document-id')
    })
  })
})
