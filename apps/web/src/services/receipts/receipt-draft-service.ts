import type { ActiveScope } from '@/domain/scope'
import { supabase } from '@/lib/supabase/client'
import { createMovement } from '@/services/movements/create-movement'

export type ReceiptDraftInput = {
  materialId: string
  quantityKg: number
  occurredAt: string
  sourceCounterpartyId: string | null
}

export type ReceiptDraftRecord = ReceiptDraftInput & {
  id: string
  status: 'draft' | 'posted' | 'voided'
}

function applyScopeFilters<T extends {
  eq: (column: string, value: string) => T
  is: (column: string, value: null) => T
}>(query: T, scope: ActiveScope) {
  let scoped = query
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  scoped = scope.unitId === null
    ? scoped.is('unit_id', null)
    : scoped.eq('unit_id', scope.unitId)

  return scoped
}

export async function createReceiptDraft(
  scope: ActiveScope,
  input: ReceiptDraftInput,
): Promise<{ id: string }> {
  return createMovement(scope, {
    movementType: 'receipt',
    materialId: input.materialId,
    quantityKg: input.quantityKg,
    occurredAt: input.occurredAt,
    sourceCounterpartyId: input.sourceCounterpartyId,
  })
}

export async function updateReceiptDraft(
  movementId: string,
  scope: ActiveScope,
  input: ReceiptDraftInput,
): Promise<void> {
  const query = supabase
    .from('movements')
    .update({
      material_id: input.materialId,
      quantity_kg: input.quantityKg,
      occurred_at: input.occurredAt,
      source_counterparty_id: input.sourceCounterpartyId,
    })
    .eq('id', movementId)
    .eq('movement_type', 'receipt')
    .eq('status', 'draft')

  const scoped = applyScopeFilters(query, scope)
  const { data, error } = await scoped.select('id').single()

  if (error || !data) {
    throw error ?? new Error('Receipt draft not found')
  }
}

export async function getReceiptDraft(
  movementId: string,
  scope: ActiveScope,
): Promise<ReceiptDraftRecord> {
  const query = supabase
    .from('movements')
    .select('id, material_id, quantity_kg, occurred_at, source_counterparty_id, status')
    .eq('id', movementId)
    .eq('movement_type', 'receipt')

  const scoped = applyScopeFilters(query, scope)
  const { data, error } = await scoped.single()

  if (!data) {
    throw new Error('Receipt draft not found')
  }

  if (error) {
    throw error
  }

  return {
    id: data.id,
    materialId: data.material_id,
    quantityKg: Number(data.quantity_kg),
    occurredAt: data.occurred_at,
    sourceCounterpartyId: data.source_counterparty_id,
    status: data.status,
  }
}
