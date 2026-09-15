import type { ActiveScope } from '@/domain/scope'
import { movementDraftSchema, type MovementDraft } from '@/domain/movement'
import { supabase } from '@/lib/supabase/client'

export async function createMovement(scope: ActiveScope, input: MovementDraft) {
  const draft = movementDraftSchema.parse(input)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user) {
    throw new Error('Authenticated user is required')
  }

  const { data, error } = await supabase
    .from('movements')
    .insert({
      tenant_id: scope.tenantId,
      organization_id: scope.organizationId,
      unit_id: scope.unitId,
      movement_type: draft.movementType,
      material_id: draft.materialId,
      quantity_kg: draft.quantityKg,
      occurred_at: draft.occurredAt,
      created_by: user.id,
      status: 'draft',
      source_organization_id: draft.sourceOrganizationId ?? null,
      source_unit_id: draft.sourceUnitId ?? null,
      source_counterparty_id: draft.sourceCounterpartyId ?? null,
      destination_organization_id: draft.destinationOrganizationId ?? null,
      destination_unit_id: draft.destinationUnitId ?? null,
      destination_counterparty_id: draft.destinationCounterpartyId ?? null,
      adjustment_reason: draft.adjustmentReason ?? null,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data
}
