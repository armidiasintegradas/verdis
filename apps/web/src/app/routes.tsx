import { DocumentsPage } from '@/features/documents/documents-page'
import { HomePage } from '@/features/home/home-page'
import { PendingPage } from '@/features/pending/pending-page'
import { ReceiptFlowPage } from '@/features/receipts/receipt-flow/receipt-flow-page'
import { ReceiptsPage } from '@/features/receipts/receipts-page'
import { SalesPage } from '@/features/sales/sales-page'
import { StockPage } from '@/features/stock/stock-page'
import { AppShell } from '@/ui/layout/app-shell'
import { useRouter } from './router'

export function matchReceiptFlowPath(
  pathname: string,
): { movementId: string | null } | null {
  if (pathname === '/recebimentos/novo') {
    return { movementId: null }
  }

  const prefix = '/recebimentos/novo/'
  if (!pathname.startsWith(prefix)) {
    return null
  }

  const movementId = pathname.slice(prefix.length)
  if (!movementId || movementId.includes('/')) {
    return null
  }

  return { movementId }
}

export function AppRoutes() {
  const { pathname } = useRouter()
  const receiptFlow = matchReceiptFlowPath(pathname)

  const page = (() => {
    if (receiptFlow) {
      return <ReceiptFlowPage movementId={receiptFlow.movementId} />
    }

    switch (pathname) {
      case '/recebimentos':
        return <ReceiptsPage />
      case '/estoque':
        return <StockPage />
      case '/vendas':
        return <SalesPage />
      case '/documentos':
        return <DocumentsPage />
      case '/pendencias':
        return <PendingPage />
      case '/':
      default:
        return <HomePage />
    }
  })()

  return <AppShell>{page}</AppShell>
}
