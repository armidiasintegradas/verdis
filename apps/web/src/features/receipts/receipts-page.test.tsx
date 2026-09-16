import { render, screen, within } from '@testing-library/react'
import { RouterProvider } from '@/app/router'
import { ReceiptsPage } from './receipts-page'

test('keeps the #1284 document evidence separate from its weight divergence', () => {
  render(
    <RouterProvider initialPath="/recebimentos">
      <ReceiptsPage />
    </RouterProvider>,
  )

  const movementTitle = screen.getByText('Recebimento #1284')
  const movementRow = movementTitle.closest('article')

  expect(movementRow).not.toBeNull()
  expect(within(movementRow!).getByText('Divergência de peso')).toBeInTheDocument()
  expect(within(movementRow!).getByText('Ticket #009182 anexo')).toBeInTheDocument()
})
