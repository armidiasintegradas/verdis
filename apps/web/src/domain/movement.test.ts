import { movementDraftSchema } from './movement'

test('rejects zero normal movement quantities', () => {
  const result = movementDraftSchema.safeParse({
    movementType: 'inbound',
    materialId: crypto.randomUUID(),
    quantityKg: 0,
    occurredAt: new Date().toISOString(),
  })

  expect(result.success).toBe(false)
})

test('allows a signed adjustment only with a reason', () => {
  expect(
    movementDraftSchema.safeParse({
      movementType: 'adjustment',
      materialId: crypto.randomUUID(),
      quantityKg: -5,
      adjustmentReason: 'physical inventory correction',
      occurredAt: new Date().toISOString(),
    }).success,
  ).toBe(true)

  expect(
    movementDraftSchema.safeParse({
      movementType: 'adjustment',
      materialId: crypto.randomUUID(),
      quantityKg: -5,
      occurredAt: new Date().toISOString(),
    }).success,
  ).toBe(false)
})
