import { render, screen } from '@testing-library/react'
import { RouterProvider } from './router'
import { AppRoutes } from './routes'

test('renders the documents route', () => {
  render(
    <RouterProvider initialPath="/documentos">
      <AppRoutes />
    </RouterProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
})
