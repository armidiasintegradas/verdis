import { render, screen } from '@testing-library/react'
import { Button } from './button'

test('renders a disabled primary button semantically disabled', () => {
  render(<Button disabled>CONTINUAR</Button>)

  expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'CONTINUAR' })).toHaveAttribute(
    'data-variant',
    'primary',
  )
})
