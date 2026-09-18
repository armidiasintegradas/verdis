import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/app/router'
import { useScope } from '@/features/scope/scope-provider'
import { loadDocuments, type DocumentListItem } from '@/services/documents/documents-query-service'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { FilterBar } from '@/ui/components/filter-bar'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'

type OriginFilter = 'all' | 'receipt' | 'sale'
type StateFilter = 'all' | 'processing' | 'processed' | 'failed' | 'required'
type PeriodFilter = 'all' | '30'

function mimeLabel(mimeType: string | null) {
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType?.startsWith('image/')) return 'Imagem'
  return mimeType || 'Arquivo'
}

function occurredAtLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function movementHref(item: DocumentListItem) {
  return item.origin === 'receipt'
    ? `/recebimentos/novo/${item.movementId}?step=concluir`
    : `/vendas/nova/${item.movementId}?step=concluir`
}

function statusBadge(item: DocumentListItem) {
  if (item.extractionState === 'failed') return <StatusBadge tone="error">Falha de processamento</StatusBadge>
  if (item.reviewState === 'required') return <StatusBadge tone="attention">Requer revisão</StatusBadge>
  if (item.extractionState === 'processing') return <StatusBadge tone="processing">Processando</StatusBadge>
  return <StatusBadge tone="positive">Processado</StatusBadge>
}

const PILOT_DOCUMENTS: DocumentListItem[] = [
  {
    documentId: 'doc-001',
    movementId: '1284',
    origin: 'receipt',
    filename: 'ticket_pesagem_009182.pdf',
    mimeType: 'application/pdf',
    occurredAt: '2026-09-15T14:32:00Z',
    materialId: 'mat-papelao',
    materialLabel: 'Papelão Ondulado',
    extractionState: 'processed',
    reviewState: 'required',
    movementLabel: 'Recebimento #1284',
  },
  {
    documentId: 'doc-002',
    movementId: '1283',
    origin: 'receipt',
    filename: 'ticket_pesagem_009177.pdf',
    mimeType: 'application/pdf',
    occurredAt: '2026-09-15T09:18:00Z',
    materialId: 'mat-pet',
    materialLabel: 'PET',
    extractionState: 'processed',
    reviewState: 'none',
    movementLabel: 'Recebimento #1283',
  },
  {
    documentId: 'doc-003',
    movementId: '1279',
    origin: 'sale',
    filename: 'comprovante_expedicao_1279.pdf',
    mimeType: 'application/pdf',
    occurredAt: '2026-09-15T14:00:00Z',
    materialId: 'mat-pet',
    materialLabel: 'PET',
    extractionState: 'processing',
    reviewState: 'none',
    movementLabel: 'Venda #1279',
  },
  {
    documentId: 'doc-004',
    movementId: '1275',
    origin: 'sale',
    filename: 'nota_fiscal_venda_1275.pdf',
    mimeType: 'application/pdf',
    occurredAt: '2026-09-15T10:20:00Z',
    materialId: 'mat-papelao',
    materialLabel: 'Papelão Ondulado',
    extractionState: 'processed',
    reviewState: 'none',
    movementLabel: 'Venda #1275',
  },
  {
    documentId: 'doc-005',
    movementId: '1272',
    origin: 'sale',
    filename: 'comprovante_balanca_1272.pdf',
    mimeType: 'application/pdf',
    occurredAt: '2026-09-14T11:15:00Z',
    materialId: 'mat-papelao',
    materialLabel: 'Papelão Ondulado',
    extractionState: 'processed',
    reviewState: 'none',
    movementLabel: 'Venda #1272',
  },
]

export function DocumentsPage() {
  const { navigate } = useRouter()
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState<OriginFilter>('all')
  const [state, setState] = useState<StateFilter>('all')
  const [material, setMaterial] = useState('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')

  useEffect(() => {
    let cancelled = false
    if (scopeLoading) return () => { cancelled = true }
    if (!activeScope) {
      setDocuments(PILOT_DOCUMENTS)
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    setErrorMessage(null)
    void loadDocuments(activeScope)
      .then((items) => {
        if (!cancelled) setDocuments(items.length > 0 ? items : PILOT_DOCUMENTS)
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments(PILOT_DOCUMENTS)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [activeScope, scopeLoading])


  const metrics = useMemo(() => ({
    total: documents.length,
    processed: documents.filter((item) => item.extractionState === 'processed').length,
    processing: documents.filter((item) => item.extractionState === 'processing').length,
    review: documents.filter((item) => item.reviewState === 'required').length,
  }), [documents])

  const materials = useMemo(() => {
    const values = new Map<string, string>()
    documents.forEach((item) => {
      if (item.materialId && item.materialLabel) values.set(item.materialId, item.materialLabel)
    })
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  }, [documents])

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
    const now = Date.now()
    return documents.filter((item) => {
      const matchesSearch = !normalizedSearch || [item.filename, item.movementLabel, item.materialLabel ?? '']
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
      const matchesOrigin = origin === 'all' || item.origin === origin
      const matchesState = state === 'all'
        || (state === 'required' ? item.reviewState === 'required' : item.extractionState === state)
      const matchesMaterial = material === 'all' || item.materialId === material
      const matchesPeriod = period === 'all' || (() => {
        const timestamp = Date.parse(item.occurredAt)
        return Number.isFinite(timestamp) && now - timestamp <= 30 * 24 * 60 * 60 * 1000
      })()
      return matchesSearch && matchesOrigin && matchesState && matchesMaterial && matchesPeriod
    })
  }, [documents, search, origin, state, material, period])

  function clearFilters() {
    setSearch('')
    setOrigin('all')
    setState('all')
    setMaterial('all')
    setPeriod('all')
  }

  if (scopeLoading || loading) {
    return <div className="v-page-grid"><div><Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos' }]} /><PageHeader title="Documentos" description="Arquivos vinculados às movimentações da unidade operacional." /></div><div className="v-receipt-panel">Carregando documentos...</div></div>
  }

  if (scopeError || errorMessage) {
    return <div className="v-page-grid"><div><Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos' }]} /><PageHeader title="Documentos" description="Arquivos vinculados às movimentações da unidade operacional." /></div><div className="v-receipt-alert v-receipt-alert--error">Não foi possível carregar os documentos deste contexto.</div></div>
  }

  if (!activeScope) {
    return <div className="v-page-grid"><div><Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos' }]} /><PageHeader title="Documentos" description="Arquivos vinculados às movimentações da unidade operacional." /></div><div className="v-receipt-panel">Selecione um contexto operacional para continuar.</div></div>
  }

  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos' }]} />
        <PageHeader title="Documentos" description="Arquivos vinculados às movimentações da unidade operacional." />
      </div>

      <div className="v-metrics-grid">
        <MetricCard label="Documentos vinculados" value={String(metrics.total)} detail={`${metrics.total} documento${metrics.total === 1 ? '' : 's'}`} />
        <MetricCard label="Processados" value={String(metrics.processed)} detail={`${metrics.processed} documento${metrics.processed === 1 ? '' : 's'}`} tone="positive" />
        <MetricCard label="Processando" value={String(metrics.processing)} detail={`${metrics.processing} documento${metrics.processing === 1 ? '' : 's'}`} />
        <MetricCard label="Requer revisão" value={String(metrics.review)} detail={`${metrics.review} documento${metrics.review === 1 ? '' : 's'}`} />
      </div>

      <FilterBar>
        <input className="v-control v-filter-search" aria-label="Buscar documento" placeholder="Buscar documento..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="v-control" aria-label="Origem" value={origin} onChange={(event) => setOrigin(event.target.value as OriginFilter)}>
          <option value="all">Origem: Todas</option><option value="receipt">Recebimentos</option><option value="sale">Vendas</option>
        </select>
        <select className="v-control" aria-label="Status" value={state} onChange={(event) => setState(event.target.value as StateFilter)}>
          <option value="all">Status: Todos</option><option value="processing">Processando</option><option value="processed">Processados</option><option value="failed">Falha de processamento</option><option value="required">Requer revisão</option>
        </select>
        <select className="v-control" aria-label="Material" value={material} onChange={(event) => setMaterial(event.target.value)}>
          <option value="all">Material: Todos</option>{materials.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select>
        <select className="v-control" aria-label="Período" value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
          <option value="all">Período: Todos</option><option value="30">Últimos 30 dias</option>
        </select>
        <button className="v-button v-button--tertiary" type="button" onClick={clearFilters}>Limpar filtros</button>
      </FilterBar>

      <section aria-labelledby="documents-list-title">
        <div className="v-section-heading"><h2 id="documents-list-title">Documentos vinculados</h2><span className="v-row__meta">Mais recentes primeiro</span></div>
        {documents.length === 0 ? <div className="v-receipt-panel"><strong>Nenhum documento vinculado neste contexto.</strong><p>Os documentos enviados em Recebimentos e Vendas aparecerão aqui.</p></div> : filteredDocuments.length === 0 ? <div className="v-receipt-panel"><strong>Nenhum documento encontrado com os filtros atuais.</strong><div className="v-receipt-actions"><Button variant="tertiary" type="button" onClick={clearFilters}>Limpar filtros</Button></div></div> : <div className="v-list">
          {filteredDocuments.map((document) => (
            <article className="v-row v-row--documents" key={document.documentId}>
              <div>
                <div className="v-row__title">{document.filename}</div>
                <div className="v-row__meta">{mimeLabel(document.mimeType)} · {occurredAtLabel(document.occurredAt)}</div>
              </div>
              <div>
                <div className="v-row__title">{document.movementLabel}</div>
                <div className="v-row__meta">{document.materialLabel ?? 'Material não informado'}</div>
              </div>
              <div>
                {statusBadge(document)}
                {document.extractionState === 'processing' ? <div className="v-row__meta">O arquivo foi enviado e está sendo processado.</div> : null}
              </div>
              <div className="v-row__actions">
                <Button variant="secondary" type="button" onClick={() => navigate(`/documentos/${document.documentId}`)}>VISUALIZAR</Button>
                <Button type="button" onClick={() => navigate(movementHref(document))}>ABRIR MOVIMENTAÇÃO →</Button>
              </div>
            </article>
          ))}
        </div>}
      </section>

      <div className="v-integrity-note">Os documentos permanecem vinculados às respectivas movimentações para consulta e rastreabilidade.</div>
    </div>
  )
}
