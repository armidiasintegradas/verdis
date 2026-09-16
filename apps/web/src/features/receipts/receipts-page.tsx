import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { FilterBar } from '@/ui/components/filter-bar'
import { MetricCard } from '@/ui/components/metric-card'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import { formatKg, m1Summary, receiptMovements, type DemoMovement } from '@/features/m1/demo-data'

function movementStatus(movement: DemoMovement) {
  if (movement.issue === 'divergencia_peso') {
    return (
      <>
        <StatusBadge tone="attention">Divergência de peso</StatusBadge>
        <div className="v-row__meta">{movement.documentLabel}</div>
      </>
    )
  }
  if (movement.documentStatus === 'processado') {
    return (
      <>
        <StatusBadge tone="positive">Documento processado</StatusBadge>
        <div className="v-row__meta">{movement.documentLabel}</div>
      </>
    )
  }
  if (movement.documentStatus === 'sem_documento') {
    return (
      <>
        <StatusBadge tone="error">Sem documento</StatusBadge>
        <div className="v-row__meta">{movement.documentLabel}</div>
      </>
    )
  }
  if (movement.documentStatus === 'pendente') {
    return (
      <>
        <StatusBadge tone="attention">Comprovação pendente</StatusBadge>
        <div className="v-row__meta">{movement.documentLabel}</div>
      </>
    )
  }
  return null
}

export function ReceiptsPage() {
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Recebimentos' }]} />
        <PageHeader
          title="Recebimentos"
          description="Entradas de materiais registradas na unidade operacional."
          action={<Button>+ RECEBER MATERIAL</Button>}
        />
      </div>

      <div className="v-metrics-grid">
        <MetricCard label="Recebido hoje" value={formatKg(m1Summary.receivedTodayKg)} detail={`${m1Summary.receiptCountToday} registros`} />
        <MetricCard label="Recebimentos hoje" value={String(m1Summary.receiptCountToday)} detail="Entradas registradas na unidade" />
        <MetricCard label="Comprovação pendente" value="2" detail="Aguardando envio ou conferência" tone="attention" />
        <MetricCard label="Divergências" value="1" detail="Decisão operacional necessária" tone="error" />
      </div>

      <FilterBar>
        <input className="v-control v-filter-search" aria-label="Buscar recebimento" placeholder="Buscar recebimento..." />
        <select className="v-control" aria-label="Período"><option>Hoje</option></select>
        <select className="v-control" aria-label="Material"><option>Todos os materiais</option></select>
        <select className="v-control" aria-label="Origem"><option>Todas as origens</option></select>
        <select className="v-control" aria-label="Status"><option>Todos os status</option></select>
        <button className="v-button v-button--tertiary" type="button">Limpar filtros</button>
      </FilterBar>

      <section aria-labelledby="receipts-list-title">
        <div className="v-section-heading"><h2 id="receipts-list-title">Recebimentos registrados</h2><span className="v-row__meta">Mais recentes primeiro</span></div>
        <div className="v-list">
          {receiptMovements.map((movement) => (
            <article className="v-row" key={movement.id}>
              <div><div className="v-row__title">Recebimento #{movement.id}</div><div className="v-row__meta">{movement.material}</div></div>
              <div><div className="v-row__value">{formatKg(movement.quantityKg)}</div><div className="v-row__meta">{movement.occurredAtLabel}</div></div>
              <div><div>{movement.counterparty}</div><div className="v-row__meta">{movementStatus(movement)}</div></div>
              <div className="v-row__actions"><Button variant="secondary">ABRIR</Button></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
