import { RouterLink } from '@/app/router'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Card } from '@/ui/components/card'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { formatKg, m1Summary, pendingItems, receiptMovements, saleMovements } from '@/features/m1/demo-data'

export function HomePage() {
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início' }]} />
        <PageHeader
          title="Início"
          description="Bom dia, Maria. Acompanhe recebimentos, vendas, estoque e ações que precisam de resposta na unidade operacional."
        />
      </div>

      <div className="v-home-actions">
        <RouterLink className="v-home-action v-home-action--primary" to="/recebimentos">
          <span><strong>+ RECEBER MATERIAL</strong><small>Registrar uma nova entrada de material</small></span>
          <span aria-hidden="true">→</span>
        </RouterLink>
        <RouterLink className="v-home-action" to="/vendas">
          <span><strong>+ REGISTRAR VENDA</strong><small>Registrar uma saída comercial de material</small></span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <section aria-labelledby="home-summary-title">
        <div className="v-section-heading"><h2 id="home-summary-title">Resumo de hoje</h2><span className="v-row__meta">15 de setembro de 2026</span></div>
        <div className="v-metrics-grid">
          <MetricCard label="Recebido hoje" value={formatKg(m1Summary.receivedTodayKg)} detail={`${m1Summary.receiptCountToday} registros`} />
          <MetricCard label="Vendido hoje" value={m1Summary.soldTodayLabel} detail={`${m1Summary.salesCountToday} vendas registradas`} tone="positive" />
          <MetricCard label="Estoque atual" value={formatKg(m1Summary.stockTotalKg)} detail="Saldo operacional da unidade" />
          <MetricCard label="Pendências" value={String(m1Summary.pendingCount)} detail="Ações que requerem resposta" tone="attention" />
        </div>
      </section>

      <Card className="v-content-card">
        <div className="v-section-heading">
          <h2>Pendências prioritárias</h2>
          <RouterLink to="/pendencias">Ver todas →</RouterLink>
        </div>
        <div className="v-list">
          {pendingItems.slice(0, 3).map((item) => (
            <div className="v-home-pending" key={item.id}>
              <StatusBadge tone="attention">{item.type === 'documento_ausente' ? 'Documento ausente' : 'Divergência'}</StatusBadge>
              <div><strong>{item.movementLabel}</strong><p>{item.message}</p></div>
              <RouterLink className="v-button v-button--secondary" to="/pendencias">Resolver</RouterLink>
            </div>
          ))}
        </div>
      </Card>

      <Card className="v-content-card">
        <div className="v-section-heading"><h2>Últimas atividades registradas</h2></div>
        <div className="v-activity-grid">
          <div><small>RECEBIMENTO</small><strong>#{receiptMovements[0].id}</strong><span>{receiptMovements[0].material} · {formatKg(receiptMovements[0].quantityKg)}</span></div>
          <div><small>VENDA</small><strong>#{saleMovements[0].id}</strong><span>{saleMovements[0].material} · {formatKg(saleMovements[0].quantityKg)}</span></div>
          <div><small>DOCUMENTO</small><strong>Ticket_009182.jpg</strong><span>Vinculado ao Recebimento #1284</span></div>
        </div>
      </Card>
    </div>
  )
}
