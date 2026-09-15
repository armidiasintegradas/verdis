import { render, screen } from '@testing-library/react'
import { App } from './app'

test('renders Verdis core shell', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /verdis core/i })).toBeInTheDocument()
})
