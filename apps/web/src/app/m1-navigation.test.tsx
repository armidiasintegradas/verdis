import { render, screen } from '@testing-library/react'
import { RouterProvider } from './router'
import { AppRoutes } from './routes'

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
