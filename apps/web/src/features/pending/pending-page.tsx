import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { FilterBar } from '@/ui/components/filter-bar'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { m1Summary, pendingItems } from '@/features/m1/demo-data'

export function PendingPage() {
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Pendências' }]} />
        <PageHeader title="Pendências" description="Itens que precisam da sua ação para completar movimentações." />
      </div>

      <div className="v-metrics-grid">
        <MetricCard label="Pendências abertas" value={String(m1Summary.pendingCount)} detail="Aguardando ação" tone="attention" />
        <MetricCard label="Documentos ausentes" value={String(m1Summary.missingDocumentCount)} detail="Anexação necessária" tone="attention" />
        <MetricCard label="Divergências" value={String(m1Summary.divergenceCount)} detail="Decisão necessária" tone="attention" />
        <MetricCard label="Resolvidas hoje" value={String(m1Summary.resolvedTodayCount)} detail="Concluídas" tone="positive" />
      </div>

      <FilterBar>
        <input className="v-control v-filter-search" aria-label="Buscar pendência" placeholder="Buscar pendência..." />
        <select className="v-control" aria-label="Tipo"><option>Tipo: Todos</option></select>
        <select className="v-control" aria-label="Origem"><option>Origem: Todas</option></select>
        <select className="v-control" aria-label="Período"><option>Período: Últimos 30 dias</option></select>
        <select className="v-control" aria-label="Status"><option>Status: Abertas</option></select>
        <button className="v-button v-button--tertiary" type="button">Limpar filtros</button>
      </FilterBar>

      <section aria-labelledby="pending-list-title">
        <div className="v-section-heading"><h2 id="pending-list-title">Requer sua ação</h2><span className="v-row__meta">3 itens</span></div>
        <div className="v-list">
          {pendingItems.map((item) => (
            <article className="v-pending-card" key={item.id}>
              <div className="v-pending-card__topline">
                <StatusBadge tone="attention">{item.type === 'documento_ausente' ? 'Documento ausente' : 'Divergência'}</StatusBadge>
                <strong>{item.movementLabel}</strong>
                <span>{item.material}</span>
              </div>
              <div className="v-pending-card__body">
                <div><strong>{item.message}</strong><p>{item.type === 'documento_ausente' ? 'Anexe um documento relacionado à movimentação para completar a rastreabilidade.' : 'Revise os dados registrados e escolha a decisão que deve permanecer no histórico.'}</p></div>
                <div className="v-row__actions"><Button variant="secondary">{item.secondaryAction}</Button><Button>{item.primaryAction} →</Button></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
