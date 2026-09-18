import { useEffect, useState } from 'react'
import { useScope } from '@/features/scope/scope-provider'
import { getSubjectTimeline } from './audit-service'
import type { AuditEventItem } from './types'
import { StatusBadge } from '@/ui/components/status-badge'

export type AuditTimelineProps = {
  subjectType: string
  subjectId: string
  title?: string
}

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

export function AuditTimeline({
  subjectType,
  subjectId,
  title = 'Linha do Tempo Probatória',
}: AuditTimelineProps) {
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const [events, setEvents] = useState<AuditEventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (scopeLoading) return () => { cancelled = true }
    if (!activeScope) {
      setLoading(false)
      setEvents([])
      return () => { cancelled = true }
    }

    setLoading(true)
    setError(false)

    void getSubjectTimeline(activeScope, subjectType, subjectId)
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [activeScope, scopeLoading, subjectType, subjectId])

  if (scopeLoading || loading) {
    return (
      <section className="v-receipt-panel" aria-label="Linha do tempo">
        <div>Carregando linha do tempo probatória...</div>
      </section>
    )
  }

  if (scopeError || error) {
    return (
      <section className="v-receipt-panel" aria-label="Linha do tempo">
        <div className="v-receipt-alert v-receipt-alert--error">
          Não foi possível carregar o histórico de auditoria.
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    return (
      <section className="v-receipt-panel" aria-label="Linha do tempo">
        <div className="v-section-heading">
          <h2>{title}</h2>
        </div>
        <div className="v-integrity-note">
          Nenhum evento registrado para esta entidade.
        </div>
      </section>
    )
  }

  return (
    <section className="v-receipt-panel" aria-label="Linha do tempo">
      <div className="v-section-heading">
        <h2>{title}</h2>
        <StatusBadge tone="positive">{events.length} {events.length === 1 ? 'evento' : 'eventos'}</StatusBadge>
      </div>

      <div className="v-list">
        {events.map((evt) => (
          <article key={evt.id} className="v-row" data-testid={`audit-event-${evt.id}`}>
            <div>
              <div className="v-row__meta">{formatDate(evt.occurredAt)}</div>
              <div className="v-row__title" style={{ fontFamily: 'var(--v-font-mono, monospace)', fontSize: '0.9rem' }}>
                {evt.action}
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
        Registro imutável append-only: fatos probatórios preservados conforme PRD.
      </div>
    </section>
  )
}
