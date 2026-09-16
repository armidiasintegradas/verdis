import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { FilterBar } from '@/ui/components/filter-bar'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { formatKg, m1Summary, stockItems } from '@/features/m1/demo-data'

export function StockPage() {
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Estoque' }]} />
        <PageHeader title="Estoque" description="Saldo atual dos materiais na unidade operacional." />
      </div>

      <div className="v-metrics-grid">
        <MetricCard label="Estoque total" value={formatKg(m1Summary.stockTotalKg)} detail="Saldo calculado a partir das entradas e saídas registradas." />
        <MetricCard label="Materiais com saldo" value="4" detail="Materiais cadastrados ativos" />
        <MetricCard label="Entradas hoje" value={formatKg(m1Summary.receivedTodayKg)} detail="Total recebido hoje" tone="positive" />
        <MetricCard label="Saídas hoje" value="1.000 kg" detail="Expedição registrada" />
      </div>

      <FilterBar>
        <input className="v-control v-filter-search" aria-label="Buscar material" placeholder="Buscar material..." />
        <select className="v-control" aria-label="Categoria"><option>Categoria: Todas</option></select>
        <select className="v-control" aria-label="Unidade"><option>Unidade: Galpão 01</option></select>
        <select className="v-control" aria-label="Ordenar"><option>Ordenar por: Maior saldo</option></select>
        <button className="v-button v-button--tertiary" type="button">Limpar filtros</button>
      </FilterBar>

      <section aria-labelledby="stock-list-title">
        <div className="v-section-heading"><h2 id="stock-list-title">Materiais registrados (4)</h2><span className="v-row__meta">Saldo derivado das movimentações registradas</span></div>
        <div className="v-list">
          {stockItems.map((item) => (
            <article className="v-row" key={item.material}>
              <div><div className="v-row__title">{item.material}</div><div className="v-row__meta">{item.category}</div></div>
              <div><div className="v-row__meta">SALDO ATUAL</div><div className="v-row__value">{formatKg(item.balanceKg)}</div></div>
              <div><div>Última movimentação</div><div className="v-row__meta">{item.lastMovementLabel}</div></div>
              <div className="v-row__actions"><Button variant="secondary">ABRIR DETALHE</Button></div>
            </article>
          ))}
        </div>
      </section>

      <div className="v-integrity-note">Os saldos são calculados a partir das movimentações registradas.</div>
    </div>
  )
}
