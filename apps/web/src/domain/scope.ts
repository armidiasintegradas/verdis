import { z } from 'zod'

export const activeScopeSchema = z.object({
  tenantId: z.uuid(),
  organizationId: z.uuid(),
  unitId: z.uuid().nullable(),
})

export type ActiveScope = z.infer<typeof activeScopeSchema>
