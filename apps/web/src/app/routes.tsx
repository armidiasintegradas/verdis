import { AuditCenterPage } from '@/features/audit/audit-center-page'
import { DocumentDetailPage } from '@/features/documents/document-detail-page'
import { DocumentsPage } from '@/features/documents/documents-page'
import { HomePage } from '@/features/home/home-page'
import { PendingPage } from '@/features/pending/pending-page'
import { ReceiptFlowPage } from '@/features/receipts/receipt-flow/receipt-flow-page'
import { ReceiptsPage } from '@/features/receipts/receipts-page'
import { SaleFlowPage } from '@/features/sales/sale-flow/sale-flow-page'
import { SalesPage } from '@/features/sales/sales-page'
import { StockPage } from '@/features/stock/stock-page'
import { AppShell } from '@/ui/layout/app-shell'
import { useRouter } from './router'

function matchFlowPath(pathname: string, base: string): { movementId: string | null } | null {
  if (pathname === base) return { movementId: null }
  const prefix = `${base}/`
  if (!pathname.startsWith(prefix)) return null
  const movementId = pathname.slice(prefix.length)
  if (!movementId || movementId.includes('/')) return null
  return { movementId }
}

export function matchReceiptFlowPath(pathname: string) {
  return matchFlowPath(pathname, '/recebimentos/novo')
}

export function matchSaleFlowPath(pathname: string) {
  return matchFlowPath(pathname, '/vendas/nova')
}

export function matchDocumentDetailPath(pathname: string): { documentId: string } | null {
  const prefix = '/documentos/'
  if (!pathname.startsWith(prefix)) return null
  const documentId = pathname.slice(prefix.length)
  if (!documentId || documentId.includes('/')) return null
  return { documentId }
}

export function AppRoutes() {
  const { pathname } = useRouter()
  const receiptFlow = matchReceiptFlowPath(pathname)
  const saleFlow = matchSaleFlowPath(pathname)
  const documentDetail = matchDocumentDetailPath(pathname)

  const page = (() => {
    if (receiptFlow) return <ReceiptFlowPage movementId={receiptFlow.movementId} />
    if (saleFlow) return <SaleFlowPage movementId={saleFlow.movementId} />
    if (documentDetail) return <DocumentDetailPage documentId={documentDetail.documentId} />

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
      case '/auditoria':
        return <AuditCenterPage />
      case '/':
      default:
        return <HomePage />
    }
  })()

  return <AppShell>{page}</AppShell>
}
