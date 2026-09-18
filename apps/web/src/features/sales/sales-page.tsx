import { useRouter } from '@/app/router'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { FilterBar } from '@/ui/components/filter-bar'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { formatKg, m1Summary, saleMovements } from '@/features/m1/demo-data'

export function SalesPage() {
  const { navigate } = useRouter()
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Vendas' }]} />
        <PageHeader
          title="Vendas"
          description="Saídas comerciais de materiais registradas na unidade operacional."
          action={<Button onClick={() => navigate('/vendas/nova?step=dados')}>+ REGISTRAR VENDA</Button>}
        />
      </div>

      <div className="v-metrics-grid">
        <MetricCard label="Vendido hoje" value={m1Summary.soldTodayLabel} detail={`${m1Summary.salesCountToday} vendas registradas`} tone="positive" />
        <MetricCard label="Saídas hoje" value={String(m1Summary.salesCountToday)} detail="Expedições comerciais" />
        <MetricCard label="Material vendido hoje" value={formatKg(m1Summary.soldTodayKg)} detail="Volume total vendido hoje" />
        <MetricCard label="Documentos pendentes" value="1" detail="Aguardando envio" tone="attention" />
      </div>

      <FilterBar>
        <input className="v-control v-filter-search" aria-label="Buscar venda" placeholder="Buscar venda..." />
        <select className="v-control" aria-label="Período"><option>Período: Últimos 30 dias</option></select>
        <select className="v-control" aria-label="Material"><option>Material: Todos</option></select>
        <select className="v-control" aria-label="Comprador"><option>Comprador: Todos</option></select>
        <select className="v-control" aria-label="Comprovação"><option>Comprovação: Todos</option></select>
        <button className="v-button v-button--tertiary" type="button">Limpar filtros</button>
      </FilterBar>

      <section aria-labelledby="sales-list-title">
        <div className="v-section-heading"><h2 id="sales-list-title">Vendas registradas</h2><span className="v-row__meta">Ordenadas por data mais recente</span></div>
        <div className="v-list">
          {saleMovements.map((movement) => (
            <article className="v-row v-row--sales" key={movement.id}>
              <div><div className="v-row__title">Venda #{movement.id}</div><div className="v-row__meta">{movement.material} · {movement.counterparty} · {movement.occurredAtLabel}</div></div>
              <div><div className="v-row__value">{formatKg(movement.quantityKg)}</div><div className="v-row__meta">{movement.unitPriceLabel}</div></div>
              <div><div className="v-row__value">{movement.valueLabel}</div><div className="v-row__meta">VALOR TOTAL</div></div>
              <div className="v-row__actions">
                {movement.documentStatus === 'pendente' ? <StatusBadge tone="attention">Documento pendente</StatusBadge> : <StatusBadge tone="positive">Documento processado</StatusBadge>}
                <Button variant="secondary">ABRIR</Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="v-integrity-note">Os registros de vendas refletem as saídas operacionais de estoque e comprovantes anexados.</div>
    </div>
  )
}