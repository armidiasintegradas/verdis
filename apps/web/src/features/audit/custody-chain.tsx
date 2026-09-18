import { useEffect, useState } from 'react'
import { useScope } from '@/features/scope/scope-provider'
import { getCustodyChain } from './audit-service'
import type { CustodyChainResult } from './types'
import { StatusBadge } from '@/ui/components/status-badge'

type CustodyChainProps = {
  initialLotId?: string
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

export function CustodyChain({ initialLotId }: CustodyChainProps) {
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const [lotInput, setLotInput] = useState(initialLotId ?? '')
  const [selectedLotId, setSelectedLotId] = useState<string | null>(initialLotId ?? null)
  const [chainResult, setChainResult] = useState<CustodyChainResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialLotId) {
      setSelectedLotId(initialLotId)
      setLotInput(initialLotId)
    }
  }, [initialLotId])

  useEffect(() => {
    if (!selectedLotId || !activeScope || scopeLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    getCustodyChain(activeScope, { type: 'lot', id: selectedLotId })
      .then((data) => {
        if (!cancelled) setChainResult(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao buscar cadeia de custódia')
          setChainResult(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedLotId, activeScope, scopeLoading])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (lotInput.trim()) {
      setSelectedLotId(lotInput.trim())
    }
  }

  if (scopeError) {
    return (
      <section className="v-receipt-panel">
        <div className="v-receipt-alert v-receipt-alert--error">Contexto de escopo indisponível.</div>
      </section>
    )
  }

  const upstreamLinks = chainResult?.links.filter((l) => l.toId === selectedLotId) ?? []
  const downstreamLinks = chainResult?.links.filter((l) => l.fromId === selectedLotId) ?? []

  return (
    <section className="v-receipt-panel" data-testid="custody-chain-panel">
      <div className="v-section-heading">
        <h2>Cadeia de Custódia Digital</h2>
        <StatusBadge tone="neutral">Genealogia Bidirecional</StatusBadge>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          className="v-control"
          placeholder="Digite o UUID do lote..."
          value={lotInput}
          onChange={(e) => setLotInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="v-button v-button--primary">
          Rastrear
        </button>
      </form>

      {loading ? (
        <div className="v-integrity-note">Carregando cadeia de custódia...</div>
      ) : null}

      {error ? (
        <div className="v-receipt-alert v-receipt-alert--error">
          Não foi possível carregar a cadeia de custódia: {error}
        </div>
      ) : null}

      {!selectedLotId && !loading && !error ? (
        <div className="v-integrity-note">
          Insira o ID de um lote para rastrear a cadeia de custódia.
        </div>
      ) : null}

      {chainResult && !loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {upstreamLinks.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Origens Ancestrais (Upstream)</h3>
              <div className="v-list">
                {upstreamLinks.map((link, idx) => (
                  <div
                    key={`up-${idx}`}
                    className="v-row"
                    style={{ background: 'var(--v-bg-subtle, #fafafa)', padding: '0.5rem' }}
                  >
                    <div>
                      <span>De Lote: <code>{link.fromId}</code></span>
                      <div className="v-row__meta">Quantidade transferida: {link.quantityKg} kg</div>
                    </div>
                    <div>
                      <StatusBadge tone="processing">{link.relationship}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Nós da Cadeia de Custódia ({chainResult.nodes.length})</h3>
            <div className="v-list">
              {chainResult.nodes.map((node) => {
                const isSelected = node.id === selectedLotId
                return (
                  <article
                    key={node.id}
                    data-testid={`node-${node.id}`}
                    className="v-row"
                    style={{
                      borderLeft: isSelected ? '4px solid var(--v-color-primary, #10b981)' : undefined,
                      paddingLeft: isSelected ? '0.75rem' : undefined,
                    }}
                  >
                    <div>
                      <div className="v-row__meta">{formatDate(node.occurredAt)}</div>
                      <div className="v-row__title" style={{ fontFamily: 'monospace' }}>
                        {node.id}
                      </div>
                      <div className="v-row__meta" style={{ marginTop: '0.2rem' }}>
                        Material: <strong>{String(node.details.materialId)}</strong> | Saldo: {String(node.details.availableQuantityKg)} kg (Origem: {String(node.details.originatedQuantityKg)} kg)
                      </div>
                    </div>
                    <div>
                      {isSelected ? (
                        <StatusBadge tone="positive">Lote Selecionado</StatusBadge>
                      ) : (
                        <button
                          type="button"
                          className="v-button v-button--secondary"
                          onClick={() => {
                            setSelectedLotId(node.id)
                            setLotInput(node.id)
                          }}
                        >
                          Inspecionar
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          {downstreamLinks.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Derivações Subsequentes (Downstream)</h3>
              <div className="v-list">
                {downstreamLinks.map((link, idx) => (
                  <div
                    key={`down-${idx}`}
                    className="v-row"
                    style={{ background: 'var(--v-bg-subtle, #fafafa)', padding: '0.5rem' }}
                  >
                    <div>
                      <span>Para Lote: <code>{link.toId}</code></span>
                      <div className="v-row__meta">Quantidade derivada: {link.quantityKg} kg</div>
                    </div>
                    <div>
                      <StatusBadge tone="attention">{link.relationship}</StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
