export type DemoDocumentStatus = 'processado' | 'processando'
export type DemoMovementIssue = 'divergencia_peso' | 'divergencia_comercial'

export type DemoMovement = {
  id: string
  kind: 'recebimento' | 'venda'
  material: string
  quantityKg: number
  counterparty: string
  occurredAtLabel: string
  documentStatus?: DemoDocumentStatus | 'pendente' | 'sem_documento'
  documentLabel?: string
  issue?: DemoMovementIssue
  valueLabel?: string
  unitPriceLabel?: string
}

export type DemoDocument = {
  filename: string
  mimeLabel: string
  movementId: string
  movementLabel: string
  material: string
  context: string
  occurredAtLabel: string
  status: DemoDocumentStatus
}

export type DemoPendingItem = {
  id: string
  type: 'documento_ausente' | 'divergencia'
  movementLabel: string
  material: string
  message: string
  primaryAction: string
  secondaryAction: string
}

export type DemoStockItem = {
  material: string
  category: string
  balanceKg: number
  lastMovementLabel: string
}

export const receiptMovements: DemoMovement[] = [
  {
    id: '1284',
    kind: 'recebimento',
    material: 'Papelão Ondulado',
    quantityKg: 480,
    counterparty: 'Empresa Demo',
    occurredAtLabel: 'Hoje · 14:32',
    documentStatus: 'processado',
    documentLabel: 'Ticket #009182 anexo',
    issue: 'divergencia_peso',
  },
  {
    id: '1283',
    kind: 'recebimento',
    material: 'PET',
    quantityKg: 820,
    counterparty: 'Empresa Demo',
    occurredAtLabel: 'Hoje · 09:18',
    documentStatus: 'processado',
    documentLabel: 'Ticket #009177 conferido',
  },
  {
    id: '1282',
    kind: 'recebimento',
    material: 'PEAD',
    quantityKg: 350,
    counterparty: 'Empresa Demo',
    occurredAtLabel: 'Ontem · 16:45',
    documentStatus: 'sem_documento',
    documentLabel: 'Pendente de digitalização',
  },
  {
    id: '1281',
    kind: 'recebimento',
    material: 'Alumínio',
    quantityKg: 120,
    counterparty: 'Fornecedor Demo',
    occurredAtLabel: 'Ontem · 13:10',
    documentStatus: 'processado',
    documentLabel: 'Ticket #009160 verificado',
  },
]

export const saleMovements: DemoMovement[] = [
  {
    id: '1279',
    kind: 'venda',
    material: 'PET',
    quantityKg: 1200,
    counterparty: 'Comprador Demo',
    occurredAtLabel: 'Hoje · 14:00',
    documentStatus: 'pendente',
    documentLabel: 'Documento pendente',
    valueLabel: 'R$ 3.720,00',
    unitPriceLabel: 'R$ 3,10 / kg',
  },
  {
    id: '1275',
    kind: 'venda',
    material: 'Papelão Ondulado',
    quantityKg: 500,
    counterparty: 'Comprador Demo',
    occurredAtLabel: 'Hoje · 10:20',
    documentStatus: 'processado',
    documentLabel: 'Documento processado',
    valueLabel: 'R$ 325,00',
    unitPriceLabel: 'R$ 0,65 / kg',
  },
  {
    id: '1272',
    kind: 'venda',
    material: 'Papelão Ondulado',
    quantityKg: 500,
    counterparty: 'Comprador Demo',
    occurredAtLabel: 'Ontem · 11:15',
    documentStatus: 'processado',
    documentLabel: 'Documento processado',
    valueLabel: 'R$ 325,00',
    unitPriceLabel: 'R$ 0,65 / kg',
  },
]

export const stockItems: DemoStockItem[] = [
  { material: 'Papelão Ondulado', category: 'Papel', balanceKg: 8420, lastMovementLabel: 'Hoje · 18:20' },
  { material: 'PET', category: 'Plástico', balanceKg: 3200, lastMovementLabel: 'Hoje · 15:40' },
  { material: 'PEAD', category: 'Plástico', balanceKg: 2100, lastMovementLabel: 'Ontem · 16:45' },
  { material: 'Alumínio', category: 'Metal', balanceKg: 780, lastMovementLabel: 'Ontem · 13:10' },
]

export const documents: DemoDocument[] = [
  {
    filename: 'Ticket_009182.jpg',
    mimeLabel: 'Imagem JPG',
    movementId: '1284',
    movementLabel: 'Recebimento #1284',
    material: 'Papelão Ondulado',
    context: '480 kg · Empresa Demo',
    occurredAtLabel: '15/09/2026 · 18:20',
    status: 'processado',
  },
  {
    filename: 'Documento_Venda_1279.pdf',
    mimeLabel: 'PDF',
    movementId: '1285',
    movementLabel: 'Venda #1285',
    material: 'PET',
    context: '1.000 kg · Comprador Demo',
    occurredAtLabel: '15/09/2026 · 18:35',
    status: 'processado',
  },
  {
    filename: 'Ticket_009177.jpg',
    mimeLabel: 'Imagem JPG',
    movementId: '1283',
    movementLabel: 'Recebimento #1283',
    material: 'PET',
    context: '820 kg · Empresa Demo',
    occurredAtLabel: '15/09/2026 · 09:18',
    status: 'processado',
  },
  {
    filename: 'Comprovante_Venda_Demo.pdf',
    mimeLabel: 'PDF',
    movementId: 'demo-sale',
    movementLabel: 'Venda demonstrativa',
    material: 'Papelão Ondulado',
    context: 'Venda registrada',
    occurredAtLabel: '15/09/2026 · 19:10',
    status: 'processando',
  },
]

export const pendingItems: DemoPendingItem[] = [
  {
    id: 'sale-1279-document',
    type: 'documento_ausente',
    movementLabel: 'Venda #1279',
    material: 'PET',
    message: 'Esta venda ainda não possui documento anexado.',
    primaryAction: 'ANEXAR DOCUMENTO',
    secondaryAction: 'ABRIR VENDA',
  },
  {
    id: 'receipt-1282-document',
    type: 'documento_ausente',
    movementLabel: 'Recebimento #1282',
    material: 'PEAD',
    message: 'O recebimento foi registrado sem comprovante.',
    primaryAction: 'ANEXAR DOCUMENTO',
    secondaryAction: 'ABRIR RECEBIMENTO',
  },
  {
    id: 'sale-demo-divergence',
    type: 'divergencia',
    movementLabel: 'Venda demonstrativa',
    material: 'PET',
    message: 'Há uma divergência comercial que requer decisão do operador.',
    primaryAction: 'RESOLVER',
    secondaryAction: 'ABRIR VENDA',
  },
]

export const m1Summary = {
  receivedTodayKg: 2480,
  receiptCountToday: 6,
  soldTodayLabel: 'R$ 4.045',
  salesCountToday: 2,
  soldTodayKg: 1700,
  stockTotalKg: 18420,
  pendingCount: 3,
  missingDocumentCount: 2,
  divergenceCount: 1,
  resolvedTodayCount: 2,
  documentsLinked: 4,
  documentsProcessed: 3,
  documentsProcessing: 1,
  documentsPending: 0,
}

export function formatKg(value: number) {
  return `${new Intl.NumberFormat('pt-BR').format(value)} kg`
}
