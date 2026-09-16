import { Breadcrumb } from '@/ui/components/breadcrumb'
import { PageHeader } from '@/ui/components/page-header'

export function DocumentDetailPage({ documentId }: { documentId: string }) {
  return (
    <div className="v-page-grid">
      <div>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Documentos', href: '/documentos' }, { label: 'Documento' }]} />
        <PageHeader title="Documento" description="Detalhe da evidência vinculada à movimentação." />
      </div>
      <div className="v-receipt-panel">{documentId}</div>
    </div>
  )
}
