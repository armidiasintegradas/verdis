import { useEffect, useState } from 'react'
import { useRouter } from '@/app/router'
import { useScope } from '@/features/scope/scope-provider'
import { loadDocumentDetail, type DocumentDetailViewModel } from '@/services/documents/document-detail-service'
import { openDocumentFile } from '@/services/documents/open-document-file'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { AuditTimeline } from '@/features/audit/audit-timeline'

const kg = (value: number | null) => value === null ? 'Não identificado' : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
const money = (value: number | null) => value === null ? 'Não identificado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const signed = (value: number | null, suffix: string) => value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`

function status(detail: DocumentDetailViewModel) {
  if (detail.extractionState === 'failed') return <StatusBadge tone="error">Falha de processamento</StatusBadge>
  if (detail.reviewState === 'required') return <StatusBadge tone="attention">Requer revisão</StatusBadge>
  if (detail.extractionState === 'processing') return <StatusBadge tone="processing">Processando</StatusBadge>
  return <StatusBadge tone="positive">Processado</StatusBadge>
}

export function DocumentDetailPage({ documentId }: { documentId: string }) {
  const { navigate } = useRouter()
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const [detail, setDetail] = useState<DocumentDetailViewModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [fileError, setFileError] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (scopeLoading) return () => { cancelled = true }
    if (!activeScope) { setLoading(false); setDetail(null); return () => { cancelled = true } }
    setLoading(true); setLoadError(false)
    void loadDocumentDetail(documentId, activeScope)
      .then((value) => { if (!cancelled) setDetail(value) })
      .catch(() => { if (!cancelled) { setDetail(null); setLoadError(true) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeScope, documentId, scopeLoading])

  async function viewFile() {
    if (!detail) return
    setFileError(false)
    try { await openDocumentFile(detail.storagePath) } catch { setFileError(true) }
  }

  if (scopeLoading || loading) return <div className="v-page-grid"><div className="v-receipt-panel">Carregando documento...</div></div>
  if (scopeError || loadError) return <div className="v-page-grid"><div className="v-receipt-alert v-receipt-alert--error">Não foi possível carregar o documento deste contexto.</div></div>
  if (!detail) return <div className="v-page-grid"><div><Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos', href: '/documentos' }, { label: 'Documento' }]} /></div><div className="v-receipt-panel">Documento não encontrado neste contexto.</div></div>

  const movementHref = detail.origin === 'receipt' ? `/recebimentos/novo/${detail.movementId}?step=concluir` : `/vendas/nova/${detail.movementId}?step=concluir`

  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos', href: '/documentos' }, { label: detail.filename }]} />
        <PageHeader title={detail.filename} description="Detalhe da evidência vinculada à movimentação." />
      </div>

      <section className="v-receipt-panel">
        <div className="v-section-heading"><h2>Arquivo e movimentação</h2>{status(detail)}</div>
        <div className="v-list">
          <div className="v-row"><div><div className="v-row__meta">Origem</div><div className="v-row__title">{detail.origin === 'receipt' ? 'Recebimento' : 'Venda'}</div></div><div><div className="v-row__meta">Material</div><div className="v-row__title">{detail.material?.label ?? 'Não informado'}</div></div><div><div className="v-row__meta">Confiança da extração</div><div className="v-row__title">{detail.confidence === null ? 'Não informada' : `${Math.round(detail.confidence * 100)}%`}</div></div></div>
        </div>
        <div className="v-receipt-actions"><Button variant="secondary" type="button" onClick={viewFile}>VISUALIZAR ARQUIVO</Button><Button type="button" onClick={() => navigate(movementHref)}>ABRIR MOVIMENTAÇÃO →</Button></div>
        {fileError ? <div className="v-receipt-alert v-receipt-alert--error">Não foi possível abrir o arquivo agora. Tente novamente.</div> : null}
      </section>

      {detail.receiptComparison ? <section className="v-receipt-panel"><div className="v-section-heading"><h2>Conferência do recebimento</h2></div><div className="v-list"><div className="v-row"><div><div className="v-row__meta">Valor registrado</div><div className="v-row__title">{kg(detail.receiptComparison.registeredQuantityKg)}</div></div><div><div className="v-row__meta">Valor no documento</div><div className="v-row__title">{kg(detail.receiptComparison.documentQuantityKg)}</div></div><div><div className="v-row__meta">Diferença</div><div className="v-row__title">{signed(detail.receiptComparison.differenceKg, ' kg')}</div></div><div><div className="v-row__meta">Variação</div><div className="v-row__title">{signed(detail.receiptComparison.differencePercent, '%')}</div></div></div></div></section> : null}

      {detail.saleComparison ? <section className="v-receipt-panel"><div className="v-section-heading"><h2>Conferência da venda</h2></div><div className="v-list"><div className="v-row"><div><div className="v-row__meta">Quantidade registrada</div><div className="v-row__title">{kg(detail.saleComparison.registered.quantityKg)}</div></div><div><div className="v-row__meta">Preço registrado</div><div className="v-row__title">{money(detail.saleComparison.registered.unitPrice)}</div></div><div><div className="v-row__meta">Preço no documento</div><div className="v-row__title">{money(detail.saleComparison.documentary.unitPrice)}</div></div><div><div className="v-row__meta">Diferença total</div><div className="v-row__title">{money(detail.saleComparison.totalDifference)}</div></div></div></div></section> : null}

      {detail.resolution ? <section className="v-receipt-panel"><div className="v-section-heading"><h2>Resolução humana</h2></div><strong>{detail.resolution.label}</strong>{detail.resolution.reason ? <p>{detail.resolution.reason}</p> : null}</section> : detail.reviewState === 'required' ? <div className="v-receipt-alert">Existe uma divergência documental ainda sem resolução humana registrada.</div> : null}

      <AuditTimeline subjectType="document" subjectId={detail.documentId} />

      <div className="v-integrity-note">A extração interpreta o arquivo; a resolução humana, quando existente, permanece registrada separadamente.</div>
    </div>
  )
}
