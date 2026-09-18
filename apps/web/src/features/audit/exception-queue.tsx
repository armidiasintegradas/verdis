import { useEffect, useState } from 'react'
import { useScope } from '@/features/scope/scope-provider'
import {
  claimAuditException,
  listAuditExceptions,
  resolveAuditException,
  type ResolveAuditExceptionInput,
} from './audit-service'
import type { AuditExceptionItem } from './types'
import { StatusBadge } from '@/ui/components/status-badge'

type ExceptionQueueProps = {
  currentUserId?: string
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
    })
  } catch {
    return iso
  }
}

export function ExceptionQueue({ currentUserId }: ExceptionQueueProps) {
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const [exceptions, setExceptions] = useState<AuditExceptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionResult, setResolutionResult] = useState<
    'confirmed' | 'corrected' | 'justified' | 'rejected' | 'escalated'
  >('justified')
  const [resolutionJustification, setResolutionJustification] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadExceptions = () => {
    if (!activeScope) return
    setLoading(true)
    setError(null)
    const filterObj = statusFilter !== 'all' ? { state: statusFilter } : undefined
    listAuditExceptions(activeScope, filterObj)
      .then((data) => {
        setExceptions(data)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Falha ao listar exceções')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!scopeLoading && activeScope) {
      loadExceptions()
    }
  }, [activeScope, scopeLoading, statusFilter])

  const handleClaim = async (exceptionId: string) => {
    try {
      setActionLoading(true)
      setError(null)
      await claimAuditException(exceptionId, 'Assumido para auditoria e conferência')
      loadExceptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao assumir exceção')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolveSubmit = async (exceptionId: string) => {
    if (!resolutionJustification.trim()) {
      setError('A justificativa da resolução é obrigatória.')
      return
    }
    try {
      setActionLoading(true)
      setError(null)
      const payload: ResolveAuditExceptionInput = {
        result: resolutionResult,
        justification: resolutionJustification.trim(),
      }
      await resolveAuditException(exceptionId, payload)
      setResolvingId(null)
      setResolutionJustification('')
      loadExceptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao resolver exceção')
    } finally {
      setActionLoading(false)
    }
  }

  if (scopeLoading || loading) {
    return (
      <section className="v-receipt-panel">
        <div className="v-integrity-note">Carregando fila de exceções...</div>
      </section>
    )
  }

  if (scopeError) {
    return (
      <section className="v-receipt-panel">
        <div className="v-receipt-alert v-receipt-alert--error">
          Contexto de escopo indisponível.
        </div>
      </section>
    )
  }

  return (
    <section className="v-receipt-panel" data-testid="exception-queue">
      <div className="v-section-heading">
        <h2>Fila de Exceções</h2>
        <StatusBadge tone="neutral">{exceptions.length} itens</StatusBadge>
      </div>

      {error ? (
        <div className="v-receipt-alert v-receipt-alert--error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      ) : null}

      <div className="v-row" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <label className="v-field" style={{ minWidth: '180px' }}>
          Estado
          <select
            className="v-control"
            aria-label="Estado da Exceção"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todas as exceções</option>
            <option value="open">Abertas (open)</option>
            <option value="in_review">Em Análise (in_review)</option>
            <option value="resolved">Resolvidas (resolved)</option>
            <option value="rejected">Rejeitadas (rejected)</option>
            <option value="escalated">Escaladas (escalated)</option>
          </select>
        </label>
      </div>

      {exceptions.length === 0 ? (
        <div className="v-integrity-note">Nenhuma exceção operacional encontrada.</div>
      ) : (
        <div className="v-list">
          {exceptions.map((exc) => {
            const isAuthor = currentUserId && exc.openedByUserId === currentUserId
            const tone =
              exc.state === 'resolved'
                ? 'positive'
                : exc.state === 'rejected' || exc.state === 'escalated'
                  ? 'error'
                  : exc.state === 'in_review'
                    ? 'processing'
                    : 'attention'

            return (
              <article key={exc.id} className="v-row" data-testid={`exception-row-${exc.id}`}>
                <div>
                  <div className="v-row__meta">{formatDate(exc.openedAt)}</div>
                  <div className="v-row__title" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span>Entidade: <strong>{exc.subjectType}</strong></span>
                    <StatusBadge tone={tone}>{exc.state}</StatusBadge>
                  </div>
                  <div className="v-row__meta" style={{ marginTop: '0.25rem' }}>
                    ID: {exc.subjectId.slice(0, 8)}... | Aberta por: {exc.openedByUserId}
                  </div>
                  <div className="v-row__meta">
                    Atribuída a: {exc.assignedToUserId ? exc.assignedToUserId : 'Aguardando atribuição'}
                  </div>

                  {isAuthor ? (
                    <div
                      className="v-receipt-alert v-receipt-alert--warning"
                      style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                    >
                      Segregação de funções: o autor não pode aprovar a resolução desta exceção.
                    </div>
                  ) : null}

                  {exc.resolutionResult ? (
                    <div className="v-integrity-note" style={{ marginTop: '0.5rem' }}>
                      Resolução: <strong>{exc.resolutionResult}</strong> — {exc.resolutionJustification}
                    </div>
                  ) : null}

                  {resolvingId === exc.id ? (
                    <div
                      className="v-panel"
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: 'var(--v-bg-subtle, #f5f5f5)',
                        borderRadius: '4px',
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.5rem' }}>Resolver Exceção</h4>
                      <label className="v-field" style={{ marginBottom: '0.5rem' }}>
                        Resultado
                        <select
                          className="v-control"
                          value={resolutionResult}
                          onChange={(e) => setResolutionResult(e.target.value as any)}
                        >
                          <option value="justified">Justificado (justified)</option>
                          <option value="confirmed">Confirmado (confirmed)</option>
                          <option value="corrected">Corrigido (corrected)</option>
                          <option value="rejected">Rejeitado (rejected)</option>
                          <option value="escalated">Escalado (escalated)</option>
                        </select>
                      </label>
                      <label className="v-field" style={{ marginBottom: '0.5rem' }}>
                        Justificativa da Resolução
                        <textarea
                          className="v-control"
                          aria-label="Justificativa da Resolução"
                          rows={2}
                          value={resolutionJustification}
                          onChange={(e) => setResolutionJustification(e.target.value)}
                          placeholder="Informe a justificativa formal para a conclusão da exceção..."
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="v-button v-button--primary"
                          disabled={actionLoading}
                          onClick={() => handleResolveSubmit(exc.id)}
                        >
                          Confirmar Resolução
                        </button>
                        <button
                          type="button"
                          className="v-button v-button--secondary"
                          onClick={() => {
                            setResolvingId(null)
                            setResolutionJustification('')
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {exc.state === 'open' && !exc.assignedToUserId ? (
                    <button
                      type="button"
                      className="v-button v-button--secondary"
                      disabled={actionLoading}
                      onClick={() => handleClaim(exc.id)}
                    >
                      Assumir Análise
                    </button>
                  ) : null}

                  {exc.state === 'in_review' && !isAuthor && resolvingId !== exc.id ? (
                    <button
                      type="button"
                      className="v-button v-button--primary"
                      onClick={() => {
                        setResolvingId(exc.id)
                        setResolutionJustification('')
                      }}
                    >
                      Resolver
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
