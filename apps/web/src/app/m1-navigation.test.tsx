import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { ScopeProvider, type ScopeMembership } from '@/features/scope/scope-provider'
import { RouterProvider, useRouter } from './router'
import { AppRoutes, matchDocumentDetailPath, matchReceiptFlowPath, matchSaleFlowPath } from './routes'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

vi.mock('@/features/receipts/receipt-flow/receipt-flow-page', () => ({
  ReceiptFlowPage: ({ movementId }: { movementId: string | null }) => (
    <div data-testid="receipt-flow-page">{movementId ?? 'bootstrap'}</div>
  ),
}))

vi.mock('@/features/sales/sale-flow/sale-flow-page', () => ({
  SaleFlowPage: ({ movementId }: { movementId: string | null }) => (
    <div data-testid="sale-flow-page">{movementId ?? 'bootstrap'}</div>
  ),
}))

vi.mock('@/features/documents/document-detail-page', () => ({
  DocumentDetailPage: ({ documentId }: { documentId: string }) => (
    <div data-testid="document-detail-page">{documentId}</div>
  ),
}))

vi.mock('@/features/audit/audit-center-page', () => ({
  AuditCenterPage: () => <h1>Auditoria</h1>,
}))

const membership: ScopeMembership = {
  membershipId: 'membership-id',
  roleId: 'role-id',
  tenantId: 'tenant-id',
  organizationId: 'org-id',
  unitId: 'unit-id',
}

const cases = [
  ['/', 'Início'],
  ['/recebimentos', 'Recebimentos'],
  ['/estoque', 'Estoque'],
  ['/vendas', 'Vendas'],
  ['/documentos', 'Documentos'],
  ['/pendencias', 'Pendências'],
  ['/auditoria', 'Auditoria'],
] as const

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

test.each(cases)('renders %s with the correct active navigation item', (path, label) => {
  const routes = (
    <RouterProvider initialPath={path}>
      <AppRoutes />
    </RouterProvider>
  )

  render(
    path === '/documentos'
      ? <ScopeProvider loadMemberships={async () => [membership]}>{routes}</ScopeProvider>
      : routes,
  )

  expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()

  const activeLink = screen
    .getAllByRole('link', { name: label })
    .find((link) => link.getAttribute('aria-current') === 'page')

  expect(activeLink).toBeDefined()
})

function RouterProbe() {
  const { pathname, search, navigate } = useRouter()
  return (
    <>
      <output data-testid="location">{`${pathname}${search}`}</output>
      <button type="button" onClick={() => navigate('/recebimentos/novo/abc?step=comprovacao')}>
        navegar
      </button>
    </>
  )
}

test('separates pathname and search from the initial path', () => {
  render(
    <RouterProvider initialPath="/recebimentos/novo?step=dados">
      <RouterProbe />
    </RouterProvider>,
  )
  expect(screen.getByTestId('location')).toHaveTextContent('/recebimentos/novo?step=dados')
})

test('navigate updates pathname and search together', () => {
  render(
    <RouterProvider initialPath="/recebimentos/novo?step=dados">
      <RouterProbe />
    </RouterProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'navegar' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/recebimentos/novo/abc?step=comprovacao')
})

test('popstate reads browser pathname and search', () => {
  window.history.replaceState({}, '', '/recebimentos?from=home')
  render(<RouterProvider><RouterProbe /></RouterProvider>)
  act(() => {
    window.history.pushState({}, '', '/vendas?tab=hoje')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  expect(screen.getByTestId('location')).toHaveTextContent('/vendas?tab=hoje')
})

test.each([
  ['/recebimentos/novo', null],
  ['/recebimentos/novo/abc', 'abc'],
] as const)('matches receipt flow path %s', (pathname, movementId) => {
  expect(matchReceiptFlowPath(pathname)).toEqual({ movementId })
})

test.each([
  '/recebimentos/novo/abc/extra',
  '/recebimentos/novos',
  '/recebimentos',
])('rejects non-flow receipt path %s', (pathname) => {
  expect(matchReceiptFlowPath(pathname)).toBeNull()
})

test.each([
  ['/recebimentos/novo?step=dados', 'bootstrap'],
  ['/recebimentos/novo/abc?step=comprovacao', 'abc'],
] as const)('renders the receipt flow route for %s', (path, expectedMovement) => {
  render(<RouterProvider initialPath={path}><AppRoutes /></RouterProvider>)
  expect(screen.getByTestId('receipt-flow-page')).toHaveTextContent(expectedMovement)
})

test.each([
  ['/vendas/nova', null],
  ['/vendas/nova/abc', 'abc'],
] as const)('matches sale flow path %s', (pathname, movementId) => {
  expect(matchSaleFlowPath(pathname)).toEqual({ movementId })
})

test.each([
  '/vendas/nova/abc/extra',
  '/vendas/novas',
  '/vendas',
])('rejects non-flow sale path %s', (pathname) => {
  expect(matchSaleFlowPath(pathname)).toBeNull()
})

test.each([
  ['/vendas/nova?step=dados', 'bootstrap'],
  ['/vendas/nova/abc?step=comprovacao', 'abc'],
] as const)('renders the sale flow route for %s', (path, expectedMovement) => {
  render(<RouterProvider initialPath={path}><AppRoutes /></RouterProvider>)
  expect(screen.getByTestId('sale-flow-page')).toHaveTextContent(expectedMovement)
})

test('matches one document detail path segment', () => {
  expect(matchDocumentDetailPath('/documentos/document-id')).toEqual({ documentId: 'document-id' })
  expect(matchDocumentDetailPath('/documentos')).toBeNull()
  expect(matchDocumentDetailPath('/documentos/a/b')).toBeNull()
})

test('renders the document detail route directly', () => {
  render(<RouterProvider initialPath="/documentos/document-id"><AppRoutes /></RouterProvider>)
  expect(screen.getByTestId('document-detail-page')).toHaveTextContent('document-id')
})
