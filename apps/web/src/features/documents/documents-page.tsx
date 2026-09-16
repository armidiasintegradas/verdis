import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { FilterBar } from '@/ui/components/filter-bar'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { documents, m1Summary } from '@/features/m1/demo-data'

export function DocumentsPage() {
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos' }]} />
        <PageHeader title="Documentos" description="Arquivos vinculados às movimentações da unidade operacional." />
      </div>

      <div className="v-metrics-grid">
        <MetricCard label="Documentos vinculados" value={String(m1Summary.documentsLinked)} detail="4 documentos" />
        <MetricCard label="Processados" value={String(m1Summary.documentsProcessed)} detail="3 documentos" tone="positive" />
        <MetricCard label="Processando" value={String(m1Summary.documentsProcessing)} detail="1 documento" />
        <MetricCard label="Com pendência" value={String(m1Summary.documentsPending)} detail="0 documentos" />
      </div>

      <FilterBar>
        <input className="v-control v-filter-search" aria-label="Buscar documento" placeholder="Buscar documento..." />
        <select className="v-control" aria-label="Origem"><option>Origem: Todas</option></select>
        <select className="v-control" aria-label="Status"><option>Status: Todos</option></select>
        <select className="v-control" aria-label="Material"><option>Material: Todos</option></select>
        <select className="v-control" aria-label="Período"><option>Período: Últimos 30 dias</option></select>
        <button className="v-button v-button--tertiary" type="button">Limpar filtros</button>
      </FilterBar>

      <section aria-labelledby="documents-list-title">
        <div className="v-section-heading"><h2 id="documents-list-title">Documentos vinculados</h2><span className="v-row__meta">Mais recentes primeiro</span></div>
        <div className="v-list">
          {documents.map((document) => (
            <article className="v-row v-row--documents" key={document.filename}>
              <div>
                <div className="v-row__title">{document.filename}</div>
                <div className="v-row__meta">{document.mimeLabel} · {document.occurredAtLabel}</div>
              </div>
              <div>
                <div className="v-row__title">{document.movementLabel}</div>
                <div className="v-row__meta">{document.material} · {document.context}</div>
              </div>
              <div>
                {document.status === 'processado' ? <StatusBadge tone="positive">Documento processado</StatusBadge> : <StatusBadge tone="processing">Processando</StatusBadge>}
                {document.status === 'processando' ? <div className="v-row__meta">O arquivo já foi enviado e está sendo processado.</div> : null}
              </div>
              <div className="v-row__actions"><Button variant="secondary">VISUALIZAR</Button><Button>ABRIR MOVIMENTAÇÃO →</Button></div>
            </article>
          ))}
        </div>
      </section>

      <div className="v-integrity-note">Os documentos permanecem vinculados às respectivas movimentações para consulta e rastreabilidade.</div>
    </div>
  )
}
