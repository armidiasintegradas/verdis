import type { Database, Json } from '@/lib/supabase/database.types'

export type AuditEventRow = Database['public']['Tables']['audit_events']['Row']
export type AuditExceptionRow = Database['public']['Tables']['audit_exceptions']['Row']
export type CustodyLotRow = Database['public']['Tables']['custody_lots']['Row']
export type CustodyLotLinkRow = Database['public']['Tables']['custody_lot_links']['Row']

export type AuditEventItem = {
  id: string
  tenantId: string
  organizationId: string | null
  unitId: string | null
  actorUserId: string | null
  action: string
  subjectType: string
  subjectId: string
  correlationId: string | null
  causationEventId: string | null
  justification: string | null
  previousState: Json | null
  newState: Json | null
  technicalContext: Json
  occurredAt: string
}

export type AuditEventsFilter = {
  subjectType?: string
  subjectId?: string
  action?: string
  actorUserId?: string
  correlationId?: string
  fromDate?: string
  toDate?: string
  unitId?: string | null
}

export type AuditExceptionItem = {
  id: string
  tenantId: string
  organizationId: string
  unitId: string | null
  subjectType: string
  subjectId: string
  sourceEventId: string | null
  state: string
  openedAt: string
  openedByUserId: string
  assignedToUserId: string | null
  resolvedAt: string | null
  resolutionResult: string | null
  resolutionJustification: string | null
  correctiveEventId: string | null
  updatedAt: string
}

export type AuditExceptionsFilter = {
  state?: string
  assignedToUserId?: string | null
  subjectType?: string
  unitId?: string | null
}

export type CustodyLotItem = {
  id: string
  materialId: string
  originatedQuantityKg: number
  availableQuantityKg: number
  sourceSubjectId: string | null
  createdBy: string | null
  createdAt: string
}

export type CustodyChainNode = {
  id: string
  type: 'lot' | 'movement' | 'document'
  label: string
  details: Record<string, unknown>
  occurredAt: string
}

export type CustodyChainLink = {
  fromId: string
  toId: string
  relationship: string
  quantityKg: number
}

export type CustodyChainResult = {
  rootSubject: { type: 'lot' | 'movement'; id: string }
  nodes: CustodyChainNode[]
  links: CustodyChainLink[]
}
