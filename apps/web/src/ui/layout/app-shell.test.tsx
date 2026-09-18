import { render, screen } from '@testing-library/react'
import { RouterProvider } from '@/app/router'
import { AppShell } from './app-shell'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

test('renders the canonical navigation and generic user identity', () => {
  render(
    <RouterProvider initialPath="/documentos">
      <AppShell><h1>Documentos</h1></AppShell>
    </RouterProvider>,
  )

  expect(screen.getByText('verdis.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('Maria — Gestora')).toBeInTheDocument()
  expect(screen.getAllByLabelText('Usuário').length).toBeGreaterThan(0)
})
