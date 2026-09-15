import { hashFileSha256 } from './hash-file'

test('returns stable lowercase SHA-256 hex', async () => {
  const file = new File(['verdis'], 'ticket.txt', { type: 'text/plain' })

  expect(await hashFileSha256(file)).toBe(
    'e3b62f0935e9916c7c6b12152374990c308efbc39c1aef2babb520b589806941',
  )
  expect(await hashFileSha256(file)).toBe(await hashFileSha256(file))
})
