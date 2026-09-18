import type { ActiveScope } from '@/domain/scope'
import { supabase } from '@/lib/supabase/client'
import type {
  AuditEventItem,
  AuditEventRow,
  AuditEventsFilter,
  AuditExceptionItem,
  AuditExceptionRow,
  AuditExceptionsFilter,
  CustodyChainLink,
  CustodyChainNode,
  CustodyChainResult,
  CustodyLotRow,
} from './types'

function mapAuditEvent(row: AuditEventRow): AuditEventItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    unitId: row.unit_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    correlationId: row.correlation_id,
    causationEventId: row.causation_event_id,
    justification: row.justification,
    previousState: row.previous_state,
    newState: row.new_state,
    technicalContext: row.technical_context,
    occurredAt: row.occurred_at,
  }
}

function mapAuditException(row: AuditExceptionRow): AuditExceptionItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    unitId: row.unit_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    sourceEventId: row.source_event_id,
    state: row.state,
    openedAt: row.opened_at,
    openedByUserId: row.opened_by_user_id,
    assignedToUserId: row.assigned_to_user_id,
    resolvedAt: row.resolved_at,
    resolutionResult: row.resolution_result,
    resolutionJustification: row.resolution_justification,
    correctiveEventId: row.corrective_event_id,
    updatedAt: row.updated_at,
  }
}

export async function listAuditEvents(
  scope: ActiveScope,
  filters?: AuditEventsFilter,
): Promise<AuditEventItem[]> {
  let query = supabase
    .from('audit_events')
    .select('*')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  if (filters?.unitId !== undefined) {
    query = filters.unitId === null ? query.is('unit_id', null) : query.eq('unit_id', filters.unitId)
  }
  if (filters?.action) {
    query = query.eq('action', filters.action)
  }
  if (filters?.subjectType) {
    query = query.eq('subject_type', filters.subjectType)
  }
  if (filters?.subjectId) {
    query = query.eq('subject_id', filters.subjectId)
  }
  if (filters?.actorUserId) {
    query = query.eq('actor_user_id', filters.actorUserId)
  }
  if (filters?.correlationId) {
    query = query.eq('correlation_id', filters.correlationId)
  }
  if (filters?.fromDate) {
    query = query.gte('occurred_at', filters.fromDate)
  }
  if (filters?.toDate) {
    query = query.lte('occurred_at', filters.toDate)
  }

  const { data, error } = await query.order('occurred_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map(mapAuditEvent)
}

export async function getSubjectTimeline(
  scope: ActiveScope,
  subjectType: string,
  subjectId: string,
): Promise<AuditEventItem[]> {
  const query = supabase
    .from('audit_events')
    .select('*')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)

  const { data, error } = await query.order('occurred_at', { ascending: true })
  if (error) throw error

  return (data ?? []).map(mapAuditEvent)
}

export async function listAuditExceptions(
  scope: ActiveScope,
  filters?: AuditExceptionsFilter,
): Promise<AuditExceptionItem[]> {
  let query = supabase
    .from('audit_exceptions')
    .select('*')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)

  if (filters?.unitId !== undefined) {
    query = filters.unitId === null ? query.is('unit_id', null) : query.eq('unit_id', filters.unitId)
  }
  if (filters?.state) {
    query = query.eq('state', filters.state)
  }
  if (filters?.assignedToUserId !== undefined) {
    query = filters.assignedToUserId === null
      ? query.is('assigned_to_user_id', null)
      : query.eq('assigned_to_user_id', filters.assignedToUserId)
  }
  if (filters?.subjectType) {
    query = query.eq('subject_type', filters.subjectType)
  }

  const { data, error } = await query.order('opened_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map(mapAuditException)
}

export async function getCustodyChain(
  scope: ActiveScope,
  subject: { type: 'lot' | 'movement'; id: string },
): Promise<CustodyChainResult> {
  if (subject.type === 'lot') {
    const { data: rootLot, error: rootError } = await supabase
      .from('custody_lots')
      .select('*')
      .eq('id', subject.id)
      .eq('tenant_id', scope.tenantId)
      .eq('organization_id', scope.organizationId)
      .order('created_at', { ascending: false })

    if (rootError) throw rootError
    if (!rootLot || rootLot.length === 0) {
      throw new Error(`Lote de custódia ${subject.id} não encontrado no escopo ativo.`)
    }

    const root = rootLot[0] as CustodyLotRow

    const { data: linkRows, error: linksError } = await supabase
      .from('custody_lot_links')
      .select('*')
      .eq('tenant_id', scope.tenantId)
      .eq('organization_id', scope.organizationId)
      .or(`parent_lot_id.eq.${subject.id},child_lot_id.eq.${subject.id}`)
      .order('created_at', { ascending: true })

    if (linksError) throw linksError

    const links = linkRows ?? []
    const relatedLotIds = new Set<string>([root.id])
    for (const link of links) {
      relatedLotIds.add(link.parent_lot_id)
      relatedLotIds.add(link.child_lot_id)
    }

    const { data: relatedLotRows, error: relatedError } = await supabase
      .from('custody_lots')
      .select('*')
      .in('id', [...relatedLotIds])
      .eq('tenant_id', scope.tenantId)
      .eq('organization_id', scope.organizationId)
      .order('created_at', { ascending: true })

    if (relatedError) throw relatedError

    const nodes: CustodyChainNode[] = (relatedLotRows ?? []).map((lot) => ({
      id: lot.id,
      type: 'lot',
      label: `Lote ${lot.id.slice(0, 8)}`,
      details: {
        materialId: lot.material_id,
        originatedQuantityKg: lot.originated_quantity_kg,
        availableQuantityKg: lot.available_quantity_kg,
      },
      occurredAt: lot.created_at,
    }))

    const chainLinks: CustodyChainLink[] = links.map((link) => ({
      fromId: link.parent_lot_id,
      toId: link.child_lot_id,
      relationship: link.relation_kind,
      quantityKg: link.quantity_kg,
    }))

    return {
      rootSubject: subject,
      nodes,
      links: chainLinks,
    }
  }

  throw new Error(`Rastreabilidade direta para o tipo ${subject.type} ainda não implementada.`)
}

export type OpenAuditExceptionInput = {
  subjectType: string
  subjectId: string
  justification: string
  sourceEventId?: string
}

export async function openAuditException(
  scope: ActiveScope,
  input: OpenAuditExceptionInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('open_audit_exception', {
    p_tenant_id: scope.tenantId,
    p_organization_id: scope.organizationId,
    p_unit_id: scope.unitId ?? null as any,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_source_event_id: input.sourceEventId ?? null as any,
    p_justification: input.justification,
  })

  if (error) throw error
  return data as string
}

export async function claimAuditException(
  exceptionId: string,
  justification: string,
): Promise<void> {
  const { error } = await supabase.rpc('claim_audit_exception', {
    p_exception_id: exceptionId,
    p_justification: justification,
  })

  if (error) throw error
}

export async function reassignAuditException(
  exceptionId: string,
  assigneeUserId: string,
  justification: string,
): Promise<void> {
  const { error } = await supabase.rpc('reassign_audit_exception', {
    p_exception_id: exceptionId,
    p_assignee_user_id: assigneeUserId,
    p_justification: justification,
  })

  if (error) throw error
}

export type ResolveAuditExceptionInput = {
  result: 'confirmed' | 'corrected' | 'justified' | 'rejected' | 'escalated'
  justification: string
  correctiveEventId?: string
}

export async function resolveAuditException(
  exceptionId: string,
  input: ResolveAuditExceptionInput,
): Promise<void> {
  const { error } = await supabase.rpc('resolve_audit_exception', {
    p_exception_id: exceptionId,
    p_result: input.result,
    p_justification: input.justification,
    p_corrective_event_id: input.correctiveEventId ?? null as any,
  })

  if (error) throw error
}

