import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { RouterProvider, useRouter } from './router'
import { AppRoutes, matchReceiptFlowPath } from './routes'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

const cases = [
  ['/', 'Início'],
  ['/recebimentos', 'Recebimentos'],
  ['/estoque', 'Estoque'],
  ['/vendas', 'Vendas'],
  ['/documentos', 'Documentos'],
  ['/pendencias', 'Pendências'],
] as const

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

test.each(cases)('renders %s with the correct active navigation item', (path, label) => {
  render(
    <RouterProvider initialPath={path}>
      <AppRoutes />
    </RouterProvider>,
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

  expect(screen.getByTestId('location')).toHaveTextContent(
    '/recebimentos/novo/abc?step=comprovacao',
  )
})

test('popstate reads browser pathname and search', () => {
  window.history.replaceState({}, '', '/recebimentos?from=home')

  render(
    <RouterProvider>
      <RouterProbe />
    </RouterProvider>,
  )

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
])('rejects non-flow path %s', (pathname) => {
  expect(matchReceiptFlowPath(pathname)).toBeNull()
})

test.each([
  ['/recebimentos/novo?step=dados', 'bootstrap'],
  ['/recebimentos/novo/abc?step=comprovacao', 'abc'],
] as const)('renders the receipt flow route for %s', (path, expectedMovement) => {
  render(
    <RouterProvider initialPath={path}>
      <AppRoutes />
    </RouterProvider>,
  )

  expect(screen.getByTestId('receipt-flow-page')).toHaveTextContent(expectedMovement)
})
