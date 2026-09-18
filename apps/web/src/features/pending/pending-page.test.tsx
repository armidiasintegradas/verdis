import { render, screen } from '@testing-library/react'
import { RouterProvider } from '@/app/router'
import { PendingPage } from './pending-page'

test('shows only items requiring human action', () => {
  render(
    <RouterProvider initialPath="/pendencias">
      <PendingPage />
    </RouterProvider>,
  )

  expect(screen.getByText('Venda #1279')).toBeInTheDocument()
  expect(screen.getByText('Recebimento #1282')).toBeInTheDocument()
  expect(screen.queryByText('Comprovante_Venda_Demo.pdf')).not.toBeInTheDocument()
})
