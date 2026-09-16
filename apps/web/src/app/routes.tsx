import { useRouter } from './router'

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>
}

const routeTitles: Record<string, string> = {
  '/': 'Início',
  '/recebimentos': 'Recebimentos',
  '/estoque': 'Estoque',
  '/vendas': 'Vendas',
  '/documentos': 'Documentos',
  '/pendencias': 'Pendências',
}

export function AppRoutes() {
  const { pathname } = useRouter()
  const title = routeTitles[pathname] ?? 'Início'

  return <Placeholder title={title} />
}
