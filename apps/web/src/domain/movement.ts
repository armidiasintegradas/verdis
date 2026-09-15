import { z } from 'zod'

export const movementTypeSchema = z.enum([
  'receipt',
  'inbound',
  'outbound',
  'collection',
  'transfer',
  'sorting',
  'sale',
  'destination',
  'reject',
  'adjustment',
])

export const movementDraftSchema = z
  .object({
    movementType: movementTypeSchema,
    materialId: z.uuid(),
    quantityKg: z.number().finite(),
    occurredAt: z.iso.datetime(),
    unitId: z.uuid().nullable().optional(),
    sourceOrganizationId: z.uuid().nullable().optional(),
    sourceUnitId: z.uuid().nullable().optional(),
    sourceCounterpartyId: z.uuid().nullable().optional(),
    destinationOrganizationId: z.uuid().nullable().optional(),
    destinationUnitId: z.uuid().nullable().optional(),
    destinationCounterpartyId: z.uuid().nullable().optional(),
    adjustmentReason: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.movementType === 'adjustment') {
      if (value.quantityKg === 0) {
        context.addIssue({
          code: 'custom',
          path: ['quantityKg'],
          message: 'Adjustment quantity cannot be zero',
        })
      }
      if (!value.adjustmentReason) {
        context.addIssue({
          code: 'custom',
          path: ['adjustmentReason'],
          message: 'Adjustment reason is required',
        })
      }
      return
    }

    if (value.quantityKg <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['quantityKg'],
        message: 'Movement quantity must be greater than zero',
      })
    }
  })

export type MovementType = z.infer<typeof movementTypeSchema>
export type MovementDraft = z.infer<typeof movementDraftSchema>
