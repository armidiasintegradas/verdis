type SaleFlowPageProps = { movementId: string | null }

export function SaleFlowPage({ movementId }: SaleFlowPageProps) {
  return <div data-testid="sale-flow-page">{movementId ?? 'bootstrap'}</div>
}
