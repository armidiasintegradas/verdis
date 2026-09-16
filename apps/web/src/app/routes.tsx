import { DocumentsPage } from '@/features/documents/documents-page'
import { HomePage } from '@/features/home/home-page'
import { PendingPage } from '@/features/pending/pending-page'
import { ReceiptsPage } from '@/features/receipts/receipts-page'
import { SalesPage } from '@/features/sales/sales-page'
import { StockPage } from '@/features/stock/stock-page'
import { AppShell } from '@/ui/layout/app-shell'
import { useRouter } from './router'

export function AppRoutes() {
  const { pathname } = useRouter()

  const page = (() => {
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
