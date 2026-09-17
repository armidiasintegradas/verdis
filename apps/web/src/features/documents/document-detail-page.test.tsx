import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocumentDetailPage } from './document-detail-page'

const { loadDocumentDetail, openDocumentFile, navigate } = vi.hoisted(() => ({
  loadDocumentDetail: vi.fn(),
  openDocumentFile: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/services/documents/document-detail-service', () => ({ loadDocumentDetail }))
vi.mock('@/services/documents/open-document-file', () => ({ openDocumentFile }))
vi.mock('@/app/router', () => ({ useRouter: () => ({ navigate }) }))
vi.mock('@/features/scope/scope-provider', () => ({
  useScope: () => ({
    activeScope: { tenantId: 'tenant-1', organizationId: 'org-1', unitId: 'unit-1' },
    loading: false,
    error: null,
  }),
}))

const receiptDetail = {
  documentId: 'doc-1', movementId: 'mov-1', origin: 'receipt', filename: 'pesagem.pdf', mimeType: 'application/pdf',
  storagePath: 'tenant-1/pesagem.pdf', occurredAt: '2026-09-16T12:00:00Z', material: { id: 'mat-1', label: 'PET' },
  extractionState: 'processed', reviewState: 'required', confidence: 0.97,
  receiptComparison: { registeredQuantityKg: 480, documentQuantityKg: 482, differenceKg: 2, differencePercent: 0.416666, hasDivergence: true },
  saleComparison: null, resolution: null,
}

describe('DocumentDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); loadDocumentDetail.mockResolvedValue(receiptDetail); openDocumentFile.mockResolvedValue(undefined) })

  it('renders durable receipt facts and keeps extraction separate from review', async () => {
    render(<DocumentDetailPage documentId="doc-1" />)
    expect(await screen.findByRole('heading', { name: 'pesagem.pdf' })).toBeInTheDocument()
    expect(screen.getByText('Requer revisão')).toBeInTheDocument()
    expect(screen.getByText('480,00 kg')).toBeInTheDocument()
    expect(screen.getByText('482,00 kg')).toBeInTheDocument()
    expect(screen.getByText('+2,00 kg')).toBeInTheDocument()
    expect(screen.getByText('97%')).toBeInTheDocument()
  })

  it('opens the original through the secure file helper', async () => {
    render(<DocumentDetailPage documentId="doc-1" />)
    await screen.findByRole('heading', { name: 'pesagem.pdf' })
    fireEvent.click(screen.getByRole('button', { name: 'VISUALIZAR ARQUIVO' }))
    await waitFor(() => expect(openDocumentFile).toHaveBeenCalledWith('tenant-1/pesagem.pdf'))
  })

  it('keeps metadata visible when secure file access fails', async () => {
    openDocumentFile.mockRejectedValueOnce(new Error('signed url failed'))
    render(<DocumentDetailPage documentId="doc-1" />)
    await screen.findByRole('heading', { name: 'pesagem.pdf' })
    fireEvent.click(screen.getByRole('button', { name: 'VISUALIZAR ARQUIVO' }))
    expect(await screen.findByText('Não foi possível abrir o arquivo agora. Tente novamente.')).toBeInTheDocument()
    expect(screen.getByText('PET')).toBeInTheDocument()
  })

  it('renders a neutral not-found response for missing or out-of-scope documents', async () => {
    loadDocumentDetail.mockResolvedValueOnce(null)
    render(<DocumentDetailPage documentId="outside" />)
    expect(await screen.findByText('Documento não encontrado neste contexto.')).toBeInTheDocument()
  })
})
