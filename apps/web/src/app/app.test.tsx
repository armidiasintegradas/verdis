import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ScopeProvider, type ScopeMembership } from '@/features/scope/scope-provider'
import { RouterProvider } from './router'
import { AppRoutes } from './routes'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

const mocks = vi.hoisted(() => ({ loadDocuments: vi.fn() }))

vi.mock('@/services/documents/documents-query-service', () => ({
  loadDocuments: mocks.loadDocuments,
}))

const membership: ScopeMembership = {
  membershipId: 'membership-id',
  roleId: 'role-id',
  tenantId: 'tenant-id',
  organizationId: 'org-id',
  unitId: 'unit-id',
}

const documents = Array.from({ length: 4 }, (_, index) => ({
  documentId: `document-${index}`,
  movementId: `movement-${index}`,
  origin: 'receipt' as const,
  filename: `Documento_${index}.pdf`,
  mimeType: 'application/pdf',
  occurredAt: '2026-09-16T12:00:00Z',
  materialId: 'paper',
  materialLabel: 'Papelão',
  extractionState: 'processed' as const,
  reviewState: 'none' as const,
  movementLabel: 'Recebimento',
}))

test('renders documents inside the canonical shell', async () => {
  mocks.loadDocuments.mockResolvedValue(documents)

  render(
    <ScopeProvider loadMemberships={async () => [membership]}>
      <RouterProvider initialPath="/documentos">
        <AppRoutes />
      </RouterProvider>
    </ScopeProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('aria-current', 'page')
  expect((await screen.findAllByText('4 documentos')).length).toBeGreaterThan(0)
})
