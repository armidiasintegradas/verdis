import { useEffect, useState } from 'react'
import { useScope } from '@/features/scope/scope-provider'
import { listAuditEvents, listAuditExceptions } from './audit-service'
import type { AuditEventItem, AuditExceptionItem } from './types'
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
      setEvents([])
      setExceptions([])
      return () => { cancelled = true }
    }

    setLoading(true)
    setError(false)

    const filterObj: Record<string, any> = {}
    if (actionFilter !== 'all') filterObj.action = actionFilter
    if (subjectTypeFilter !== 'all') filterObj.subjectType = subjectTypeFilter

    Promise.all([
      listAuditEvents(activeScope, filterObj),
      listAuditExceptions(activeScope),
    ])
      .then(([eventsData, exceptionsData]) => {
        if (!cancelled) {
          setEvents(eventsData)
          setExceptions(exceptionsData)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
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
