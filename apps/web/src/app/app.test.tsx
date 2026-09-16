import { render, screen } from '@testing-library/react'
import { RouterProvider } from './router'
import { AppRoutes } from './routes'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

test('renders documents inside the canonical shell', () => {
  render(
    <RouterProvider initialPath="/documentos">
      <AppRoutes />
    </RouterProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('4 documentos')).toBeInTheDocument()
})
