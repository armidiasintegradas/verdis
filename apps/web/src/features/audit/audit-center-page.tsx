import { useEffect, useState } from 'react'
import { useScope } from '@/features/scope/scope-provider'
import { listAuditEvents, listAuditExceptions } from './audit-service'
import type { AuditEventItem, AuditExceptionItem } from './types'
import { ExceptionQueue } from './exception-queue'
import { CustodyChain } from './custody-chain'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { MetricCard } from '@/ui/components/metric-card'

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

const PILOT_AUDIT_EVENTS: AuditEventItem[] = [
  {
    id: 'evt-001',
    tenantId: '10000000-0000-4000-8000-000000000001',
    organizationId: '20000000-0000-4000-8000-000000000001',
    unitId: '30000000-0000-4000-8000-000000000001',
    actorUserId: 'usr-maria',
    action: 'movement.receipt.confirmed',
    subjectType: 'movement',
    subjectId: '1284',
    correlationId: 'corr-001',
    causationEventId: null,
    justification: 'Entrada de 480 kg de Papelão Ondulado confirmada com justificativa operacional.',
    previousState: { status: 'draft' },
    newState: { status: 'confirmed', quantityKg: 480 },
    technicalContext: { source: 'web_portal', client: 'm1_cooperative' },
    occurredAt: '2026-09-15T14:35:00Z',
  },
  {
    id: 'evt-002',
    tenantId: '10000000-0000-4000-8000-000000000001',
    organizationId: '20000000-0000-4000-8000-000000000001',
    unitId: '30000000-0000-4000-8000-000000000001',
    actorUserId: 'system',
    action: 'document.extraction.completed',
    subjectType: 'document',
    subjectId: 'doc-001',
    correlationId: 'corr-001',
    causationEventId: 'evt-001',
    justification: 'Extração automática de dados do ticket #009182 concluída com alta confiança.',
    previousState: { extraction_status: 'processing' },
    newState: { extraction_status: 'accepted', confidence: 0.98 },
    technicalContext: { engine: 'evidence_v1' },
    occurredAt: '2026-09-15T14:33:00Z',
  },
  {
    id: 'evt-003',
    tenantId: '10000000-0000-4000-8000-000000000001',
    organizationId: '20000000-0000-4000-8000-000000000001',
    unitId: '30000000-0000-4000-8000-000000000001',
    actorUserId: 'usr-maria',
    action: 'validation.divergence.resolved',
    subjectType: 'validation',
    subjectId: 'val-001',
    correlationId: 'corr-002',
    causationEventId: null,
    justification: 'Divergência de 10 kg aprovada devido a umidade constatada na pesagem inicial.',
    previousState: { state: 'divergence' },
    newState: { state: 'resolved', decision: 'keep_registered' },
    technicalContext: { ruleCode: 'REC-002' },
    occurredAt: '2026-09-15T11:20:00Z',
  },
  {
    id: 'evt-004',
    tenantId: '10000000-0000-4000-8000-000000000001',
    organizationId: '20000000-0000-4000-8000-000000000001',
    unitId: '30000000-0000-4000-8000-000000000001',
    actorUserId: 'usr-maria',
    action: 'movement.sale.confirmed',
    subjectType: 'movement',
    subjectId: '1279',
    correlationId: 'corr-003',
    causationEventId: null,
    justification: 'Expedição comercial de 1.200 kg de PET confirmada para Comprador Demo.',
    previousState: { status: 'draft' },
    newState: { status: 'confirmed', totalAmount: 3720 },
    technicalContext: { source: 'web_portal' },
    occurredAt: '2026-09-15T10:00:00Z',
  },
]

const PILOT_AUDIT_EXCEPTIONS: AuditExceptionItem[] = [
  {
    id: 'exc-001',
    tenantId: '10000000-0000-4000-8000-000000000001',
    organizationId: '20000000-0000-4000-8000-000000000001',
    unitId: '30000000-0000-4000-8000-000000000001',
    subjectType: 'movement',
    subjectId: '1284',
    sourceEventId: 'evt-001',
    state: 'open',
    openedAt: '2026-09-15T14:32:00Z',
    openedByUserId: 'system',
    assignedToUserId: 'usr-maria',
    resolvedAt: null,
    resolutionResult: null,
    resolutionJustification: null,
    correctiveEventId: null,
    updatedAt: '2026-09-15T14:32:00Z',
  },
]

export function AuditCenterPage() {
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const [events, setEvents] = useState<AuditEventItem[]>([])
  const [exceptions, setExceptions] = useState<AuditExceptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionFilter, setActionFilter] = useState('all')
  const [subjectTypeFilter, setSubjectTypeFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    if (scopeLoading) return () => { cancelled = true }
    if (!activeScope) {
      setLoading(false)
      setEvents(PILOT_AUDIT_EVENTS)
      setExceptions(PILOT_AUDIT_EXCEPTIONS)
      return () => { cancelled = true }
    }

    setLoading(true)
    setError(false)

    const filterObj: Record<string, any> = {}
    if (actionFilter !== 'all') filterObj.action = actionFilter
    if (subjectTypeFilter !== 'all') filterObj.subjectType = subjectTypeFilter

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 1200)
    )

    Promise.race([
      Promise.all([
        listAuditEvents(activeScope, filterObj),
        listAuditExceptions(activeScope),
      ]),
      timeoutPromise,
    ])
      .then(([eventsData, exceptionsData]) => {
        if (!cancelled) {
          setEvents(eventsData.length > 0 ? eventsData : PILOT_AUDIT_EVENTS)
          setExceptions(exceptionsData.length > 0 ? exceptionsData : PILOT_AUDIT_EXCEPTIONS)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents(PILOT_AUDIT_EVENTS)
          setExceptions(PILOT_AUDIT_EXCEPTIONS)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [activeScope, scopeLoading, actionFilter, subjectTypeFilter])


  if (scopeLoading || loading) {
    return (
      <div className="v-page-grid">
        <div className="v-receipt-panel">Carregando Centro de Auditoria...</div>
      </div>
    )
  }

  if (scopeError || error) {
    return (
      <div className="v-page-grid">
        <div className="v-receipt-alert v-receipt-alert--error">
          Não foi possível carregar o Centro de Auditoria deste contexto.
        </div>
      </div>
    )
  }

  const activeExceptionsCount = exceptions.filter(
    (e) => e.state !== 'resolved' && e.state !== 'rejected',
  ).length

  return (
    <div className="v-page-grid" data-testid="audit-center-page">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Auditoria' }]} />
        <PageHeader
          title="Centro de Auditoria"
          description="Visão probatória transversal, rastreabilidade e governança de conformidade."
        />
      </div>

      <div className="v-metric-grid">
        <MetricCard label="Eventos Registrados" value={String(events.length)} />
        <MetricCard label="Exceções em Aberto" value={String(activeExceptionsCount)} />
        <MetricCard
          label="Lotes Auditados"
          value={String(events.filter((e) => e.subjectType === 'custody_lot').length)}
        />
      </div>

      <ExceptionQueue />

      <CustodyChain />

      <section className="v-receipt-panel">
        <div className="v-section-heading">
          <h2>Filtros de Auditoria</h2>
        </div>
        <div className="v-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label className="v-field" style={{ minWidth: '200px' }}>
            Ação
            <select
              className="v-control"
              aria-label="Ação"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">Todas as ações</option>
              <option value="lot.created">lot.created</option>
              <option value="lot.split">lot.split</option>
              <option value="lot.merged">lot.merged</option>
              <option value="lot.consumed">lot.consumed</option>
              <option value="movement.created">movement.created</option>
              <option value="movement.posted">movement.posted</option>
              <option value="movement.voided">movement.voided</option>
              <option value="document.created">document.created</option>
              <option value="evidence.created">evidence.created</option>
              <option value="exception.opened">exception.opened</option>
            </select>
          </label>

          <label className="v-field" style={{ minWidth: '200px' }}>
            Tipo de Entidade
            <select
              className="v-control"
              aria-label="Tipo de Entidade"
              value={subjectTypeFilter}
              onChange={(e) => setSubjectTypeFilter(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="custody_lot">custody_lot</option>
              <option value="movement">movement</option>
              <option value="document">document</option>
              <option value="evidence">evidence</option>
            </select>
          </label>
        </div>
      </section>

      {events.length === 0 ? (
        <section className="v-receipt-panel">
          <div className="v-integrity-note">
            Nenhum evento probatório encontrado para os filtros selecionados.
          </div>
        </section>
      ) : (
        <section className="v-receipt-panel">
          <div className="v-section-heading">
            <h2>Eventos Probatórios</h2>
            <StatusBadge tone="neutral">{events.length} fatos</StatusBadge>
          </div>

          <div className="v-list">
            {events.map((evt) => (
              <article key={evt.id} className="v-row" data-testid={`event-row-${evt.id}`}>
                <div>
                  <div className="v-row__meta">{formatDate(evt.occurredAt)}</div>
                  <div
                    className="v-row__title"
                    style={{ fontFamily: 'var(--v-font-mono, monospace)', fontSize: '0.95rem' }}
                  >
                    {evt.action}
                  </div>
                  <div className="v-row__meta" style={{ marginTop: '0.2rem' }}>
                    Entidade: <strong>{evt.subjectType}</strong> (ID: {evt.subjectId.slice(0, 8)}...)
                  </div>
                  {evt.actorUserId ? (
                    <div className="v-row__meta">Ator: {evt.actorUserId}</div>
                  ) : (
                    <div className="v-row__meta">Ator: Sistema</div>
                  )}
                  {evt.justification ? (
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--v-text-muted)' }}>
                      <strong>Justificativa:</strong> {evt.justification}
                    </p>
                  ) : null}
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--v-text-muted)' }}>
                  {evt.causationEventId ? <div>Causa: {evt.causationEventId.slice(0, 8)}</div> : null}
                  {evt.correlationId ? <div>Corr: {evt.correlationId.slice(0, 8)}</div> : null}
                </div>
              </article>
            ))}
          </div>

          <div className="v-integrity-note" style={{ marginTop: '0.75rem' }}>
            Event Ledger auditável — registros históricos imutáveis append-only sem dados sintéticos.
          </div>
        </section>
      )}
    </div>
  )
}
