type ReceiptFlowPageProps = {
  movementId: string | null
}

export function ReceiptFlowPage({ movementId }: ReceiptFlowPageProps) {
  return (
    <div data-testid="receipt-flow-page">
      {movementId ?? 'bootstrap'}
    </div>
  )
}
