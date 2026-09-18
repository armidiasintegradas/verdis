# M1 Cooperative Shell and Overviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o VERDIS UI SYSTEM V1.1, o shell autenticado e as seis páginas-base desktop do M1 Cooperative Pilot sobre o app React/Vite existente, sem ainda implementar os fluxos profundos de Recebimento e Venda.

**Architecture:** Evoluir a aplicação existente em React 19/Vite mantendo AuthProvider, ScopeProvider, TanStack Query e Supabase. A UI será dividida em tokens + componentes canônicos + AppShell + páginas de feature; dados demonstrativos ficarão isolados em fixtures tipadas para que possam ser substituídos por queries reais nos planos seguintes.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, React Router DOM, TanStack React Query 5, Supabase JS 2, Zod 4, Vitest 3, Testing Library, CSS custom properties.

**Spec:** `docs/ux/m1-antigravity-implementation-contract.md` (complementado por `docs/ux/verdis-ui-system-v1.1.md`, `docs/ux/m1-cooperative-screen-map.md` e `docs/ux/m1-interaction-states.md`)

## Global Constraints

- Preservar React/Vite/TypeScript/Supabase/TanStack Query; não migrar de framework.
- Preservar `AuthProvider` e `ScopeProvider`; não duplicar autenticação/escopo.
- Marca canônica: `verdis.`.
- Shell canônico único para Início, Recebimentos, Estoque, Vendas, Documentos e Pendências.
- Avatar padrão: ícone genérico de pessoa; nunca iniciais.
- Desktop é o escopo deste plano; mobile fica fora.
- Estoque é derivado de movimentações; nenhuma tela deste incremento edita saldo.
- `Documento processado` não significa validado/auditado/certificado.
- `Pendência` significa ação humana necessária.
- `Sem documento` pertence a Pendências, não à biblioteca de Documentos.
- Todos os testes, typecheck e build devem passar antes de concluir.

---

## Estrutura de arquivos deste incremento

```text
apps/web/src/
  app/
    app.tsx
    app.test.tsx
    routes.tsx
    providers.tsx
  ui/
    styles/
      tokens.css
      globals.css
    layout/
      app-shell.tsx
      app-shell.css
      app-shell.test.tsx
    components/
      breadcrumb.tsx
      button.tsx
      card.tsx
      metric-card.tsx
      status-badge.tsx
      page-header.tsx
      filter-bar.tsx
      avatar.tsx
  features/
    m1/
      demo-data.ts
    home/
      home-page.tsx
    receipts/
      receipts-page.tsx
    stock/
      stock-page.tsx
    sales/
      sales-page.tsx
    documents/
      documents-page.tsx
    pending/
      pending-page.tsx
      pending-page.test.tsx
```

O incremento termina com rotas navegáveis e páginas-base visualmente coerentes, ainda alimentadas por fixtures M1 tipadas.

---

### Task 1: Introduzir roteamento explícito sem quebrar providers existentes

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/app/routes.tsx`
- Modify: `apps/web/src/app/app.tsx`
- Modify: `apps/web/src/app/app.test.tsx`

**Interfaces:**
- Consumes: `Providers` existente em `apps/web/src/app/providers.tsx`.
- Produces: `AppRoutes` e rotas estáveis `/`, `/recebimentos`, `/estoque`, `/vendas`, `/documentos`, `/pendencias`.

- [ ] **Step 1: instalar React Router DOM**

Run:

```bash
pnpm --filter @verdis/web add react-router-dom
```

Expected: `apps/web/package.json` passa a listar `react-router-dom` em `dependencies` e `pnpm-lock.yaml` é atualizado.

- [ ] **Step 2: substituir o teste-placeholder por um teste de roteamento que falha**

Substituir `apps/web/src/app/app.test.tsx` por:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './routes'

test('renders the documents route', () => {
  render(
    <MemoryRouter initialEntries={['/documentos']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
})
```

- [ ] **Step 3: rodar o teste para confirmar falha**

Run:

```bash
pnpm --filter @verdis/web test -- app.test.tsx
```

Expected: FAIL porque `./routes` e/ou a página Documentos ainda não existem.

- [ ] **Step 4: criar rotas mínimas temporárias**

Criar `apps/web/src/app/routes.tsx`:

```tsx
import { Route, Routes } from 'react-router-dom'

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder title="Início" />} />
      <Route path="/recebimentos" element={<Placeholder title="Recebimentos" />} />
      <Route path="/estoque" element={<Placeholder title="Estoque" />} />
      <Route path="/vendas" element={<Placeholder title="Vendas" />} />
      <Route path="/documentos" element={<Placeholder title="Documentos" />} />
      <Route path="/pendencias" element={<Placeholder title="Pendências" />} />
    </Routes>
  )
}
```

Substituir `apps/web/src/app/app.tsx` por:

```tsx
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: rodar teste, typecheck e build**

Run:

```bash
pnpm --filter @verdis/web test -- app.test.tsx
pnpm --filter @verdis/web typecheck
pnpm --filter @verdis/web build
```

Expected: PASS nos três comandos.

- [ ] **Step 6: commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/app/app.tsx apps/web/src/app/app.test.tsx apps/web/src/app/routes.tsx
git commit -m "feat(web): add M1 application routing"
```

---

### Task 2: Criar tokens e componentes primitivos do VERDIS UI SYSTEM V1.1

**Files:**
- Create: `apps/web/src/ui/styles/tokens.css`
- Create: `apps/web/src/ui/styles/globals.css`
- Create: `apps/web/src/ui/components/button.tsx`
- Create: `apps/web/src/ui/components/card.tsx`
- Create: `apps/web/src/ui/components/metric-card.tsx`
- Create: `apps/web/src/ui/components/status-badge.tsx`
- Create: `apps/web/src/ui/components/breadcrumb.tsx`
- Create: `apps/web/src/ui/components/page-header.tsx`
- Create: `apps/web/src/ui/components/filter-bar.tsx`
- Create: `apps/web/src/ui/components/avatar.tsx`
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/ui/components/button.test.tsx`

**Interfaces:**
- Produces: primitives reutilizáveis para todas as páginas M1.
- CSS tokens expostos em `:root`.

- [ ] **Step 1: escrever teste falho para variantes de botão**

Criar `apps/web/src/ui/components/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './button'

test('renders a disabled primary button semantically disabled', () => {
  render(<Button disabled>CONTINUAR</Button>)
  expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'CONTINUAR' })).toHaveAttribute(
    'data-variant',
    'primary',
  )
})
```

- [ ] **Step 2: rodar o teste e confirmar falha**

Run:

```bash
pnpm --filter @verdis/web test -- button.test.tsx
```

Expected: FAIL porque `Button` não existe.

- [ ] **Step 3: criar tokens canônicos recuperados do Master V1.1**

Criar `apps/web/src/ui/styles/tokens.css`:

```css
:root {
  --verdis-brand-primary: #536938;
  --verdis-brand-hover: #3e5129;
  --verdis-positive-surface: #f0f4ea;
  --verdis-app-background: #f9faf6;
  --verdis-surface: #ffffff;

  --verdis-success-surface: #e8f5e9;
  --verdis-attention-surface: #fff8e1;
  --verdis-error-surface: #ffebee;
  --verdis-info-surface: #e8f0fe;
  --verdis-neutral-surface: #f3f4f0;

  --verdis-text-primary: #20251f;
  --verdis-text-secondary: #66705f;
  --verdis-border: #e1e5dc;
  --verdis-error: #c83b32;
  --verdis-attention: #b77a00;

  --verdis-radius-sm: 8px;
  --verdis-radius-md: 12px;
  --verdis-radius-lg: 16px;

  --verdis-space-xs: 4px;
  --verdis-space-sm: 8px;
  --verdis-space-md: 16px;
  --verdis-space-lg: 24px;
  --verdis-space-xl: 32px;
  --verdis-space-2xl: 48px;

  --verdis-control-height: 40px;
  --verdis-header-height: 64px;
  --verdis-sidebar-width: 256px;

  --verdis-font-display: 'Domine', Georgia, serif;
  --verdis-font-interface: 'Manrope', 'Public Sans', Arial, sans-serif;
}
```

Observação de implementação: os valores acima correspondem ao contrato visual consolidado deste plano; qualquer ajuste posterior precisa ser feito centralmente neste arquivo, nunca por página.

- [ ] **Step 4: criar base global**

Criar `apps/web/src/ui/styles/globals.css`:

```css
* { box-sizing: border-box; }
html { background: var(--verdis-app-background); }
body {
  margin: 0;
  min-width: 320px;
  color: var(--verdis-text-primary);
  background: var(--verdis-app-background);
  font-family: var(--verdis-font-interface);
}
button, input, select, textarea { font: inherit; }
h1, h2, h3 { font-family: var(--verdis-font-display); }
a { color: inherit; }
```

- [ ] **Step 5: implementar Button**

Criar `apps/web/src/ui/components/button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      data-variant={variant}
      className={`v-button v-button--${variant} ${className}`.trim()}
    />
  )
}
```

Adicionar as classes `.v-button` e variantes em `globals.css` usando os tokens acima, incluindo `:disabled { opacity: .45; cursor: not-allowed; }`.

- [ ] **Step 6: implementar os demais primitivos como componentes finos**

`Card` deve aceitar `className` e renderizar `<section className="v-card">`.

`MetricCard` deve aceitar:

```ts
type MetricCardProps = {
  label: string
  value: string
  detail?: string
  tone?: 'neutral' | 'positive' | 'attention' | 'error'
}
```

`StatusBadge` deve aceitar:

```ts
type StatusTone = 'neutral' | 'positive' | 'processing' | 'attention' | 'error'
```

`Breadcrumb` deve receber `items: Array<{ label: string; href?: string }>`.

`PageHeader` deve receber `title`, `description` e `action?: ReactNode`.

`FilterBar` deve apenas estruturar os controles filhos sem conter regra de filtro.

`Avatar` deve renderizar ícone genérico acessível com `aria-label="Usuário"`, sem iniciais.

- [ ] **Step 7: importar estilos globais em `main.tsx`**

Adicionar antes dos imports locais:

```tsx
import '@/ui/styles/tokens.css'
import '@/ui/styles/globals.css'
```

- [ ] **Step 8: rodar testes e typecheck**

Run:

```bash
pnpm --filter @verdis/web test -- button.test.tsx
pnpm --filter @verdis/web typecheck
```

Expected: PASS.

- [ ] **Step 9: commit**

```bash
git add apps/web/src/ui apps/web/src/main.tsx
git commit -m "feat(web): add Verdis UI System primitives"
```

---

### Task 3: Construir AppShell canônico e remover header duplicado do ScopeBoundary

**Files:**
- Create: `apps/web/src/ui/layout/app-shell.tsx`
- Create: `apps/web/src/ui/layout/app-shell.css`
- Create: `apps/web/src/ui/layout/app-shell.test.tsx`
- Modify: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/features/scope/scope-selector.tsx`

**Interfaces:**
- Consumes: `useScope()` e `ScopeSelector` existentes.
- Produces: `AppShell({ children })` para todas as rotas M1.

- [ ] **Step 1: escrever teste falho do shell**

Criar `apps/web/src/ui/layout/app-shell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './app-shell'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

test('renders the canonical navigation and generic user identity', () => {
  render(
    <MemoryRouter initialEntries={['/documentos']}>
      <AppShell><h1>Documentos</h1></AppShell>
    </MemoryRouter>,
  )

  expect(screen.getByText('verdis.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('Maria — Gestora')).toBeInTheDocument()
  expect(screen.getByLabelText('Usuário')).toBeInTheDocument()
})
```

- [ ] **Step 2: rodar teste para confirmar falha**

Run:

```bash
pnpm --filter @verdis/web test -- app-shell.test.tsx
```

Expected: FAIL porque `AppShell` não existe.

- [ ] **Step 3: remover header estrutural do `ScopeBoundary`**

Em `providers.tsx`, substituir o retorno atual que envolve `<header><ScopeSelector /></header>` por:

```tsx
return children
```

Remover o import de `ScopeSelector` desse arquivo. O provider deve cuidar de sessão/escopo, não de layout.

- [ ] **Step 4: tornar `ScopeSelector` sempre capaz de representar o escopo ativo**

Quando houver uma única membership, renderizar um `<span>` com `aria-label="Unidade operacional ativa"` em vez de `null`. Quando houver múltiplas memberships, manter o `<select>`.

Não introduzir nomes fictícios derivados de UUID; o componente deve expor somente o que possui. O texto de demonstração `Cooperativa Demo · M1 Pilot` fica no `AppShell` como fixture de apresentação até o plano de dados organizacionais.

- [ ] **Step 5: implementar `AppShell`**

O componente deve:

- usar `NavLink` para as seis rotas;
- marcar item ativo via `aria-current` fornecido por `NavLink`;
- renderizar `verdis.` no topo;
- renderizar `AMBIENTE: M1 COOPERATIVE PILOT`;
- renderizar header com unidade, operação ativa, busca, notificações e identidade do usuário;
- renderizar `<main>` para `children`;
- usar `Avatar` genérico.

Rotas de navegação:

```ts
const navItems = [
  ['Início', '/'],
  ['Recebimentos', '/recebimentos'],
  ['Estoque', '/estoque'],
  ['Vendas', '/vendas'],
  ['Documentos', '/documentos'],
  ['Pendências', '/pendencias'],
] as const
```

- [ ] **Step 6: implementar CSS de shell**

`app-shell.css` deve usar exclusivamente tokens V1.1 e um grid desktop:

```css
.v-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--verdis-sidebar-width) minmax(0, 1fr);
}
.v-shell__main {
  min-width: 0;
}
.v-shell__content {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--verdis-space-xl);
}
```

Implementar sidebar/header sem valores de cor hardcoded fora dos tokens.

- [ ] **Step 7: rodar teste e suite de scope**

Run:

```bash
pnpm --filter @verdis/web test -- app-shell.test.tsx scope-provider.test.tsx
pnpm --filter @verdis/web typecheck
```

Expected: PASS.

- [ ] **Step 8: commit**

```bash
git add apps/web/src/ui/layout apps/web/src/app/providers.tsx apps/web/src/features/scope/scope-selector.tsx
git commit -m "feat(web): add canonical M1 app shell"
```

---

### Task 4: Criar fixtures M1 tipadas e seis páginas-base

**Files:**
- Create: `apps/web/src/features/m1/demo-data.ts`
- Create: `apps/web/src/features/home/home-page.tsx`
- Create: `apps/web/src/features/receipts/receipts-page.tsx`
- Create: `apps/web/src/features/stock/stock-page.tsx`
- Create: `apps/web/src/features/sales/sales-page.tsx`
- Create: `apps/web/src/features/documents/documents-page.tsx`
- Create: `apps/web/src/features/pending/pending-page.tsx`
- Create: `apps/web/src/features/pending/pending-page.test.tsx`

**Interfaces:**
- Produces: páginas de visão geral alimentadas por fixtures isoladas.
- Consumes: componentes UI da Task 2 e AppShell da Task 3.

- [ ] **Step 1: escrever teste falho para a regra Pendências ≠ Documentos processando**

Criar `pending-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { PendingPage } from './pending-page'

test('shows only items requiring human action', () => {
  render(<PendingPage />)
  expect(screen.getByText('Venda #1279')).toBeInTheDocument()
  expect(screen.getByText('Recebimento #1282')).toBeInTheDocument()
  expect(screen.queryByText('Comprovante_Venda_Demo.pdf')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: rodar teste e confirmar falha**

Run:

```bash
pnpm --filter @verdis/web test -- pending-page.test.tsx
```

Expected: FAIL porque a página ainda não existe.

- [ ] **Step 3: criar `demo-data.ts` com tipos explícitos**

Definir e exportar:

```ts
export type DemoDocumentStatus = 'processado' | 'processando'

export type DemoMovement = {
  id: string
  kind: 'recebimento' | 'venda'
  material: string
  quantityKg: number
  counterparty: string
  occurredAtLabel: string
  documentStatus?: DemoDocumentStatus | 'pendente' | 'sem_documento'
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
```

Popular apenas com os exemplos já homologados: Recebimento #1284/#1283/#1282, Venda #1279/#1275/#1272/#1285 demonstrativa, materiais e documentos do screen map.

- [ ] **Step 4: implementar cada página usando componentes canônicos**

Todas as páginas devem começar com `Breadcrumb` + `PageHeader` e usar `MetricCard`, `Card`, `StatusBadge` e `FilterBar` em vez de markup visual duplicado.

Conteúdo mínimo:

- Home: CTAs Receber/Registrar Venda, resumo operacional, pendências e atividades;
- Recebimentos: métricas + filtros + lista;
- Estoque: 18.420 kg total, quatro materiais e saldos homologados;
- Vendas: R$ 4.045, 2 saídas, 1.700 kg e três registros homologados;
- Documentos: 4 vinculados, 3 processados, 1 processando, 0 com pendência;
- Pendências: 3 abertas, 2 documentos ausentes, 1 divergência, 2 resolvidas hoje.

Nenhuma página implementa ainda formulários/stepper profundos.

- [ ] **Step 5: garantir linguagem canônica**

Não usar nas páginas:

- auditado;
- certificado;
- conforme;
- homologado como status de contraparte;
- sincronização em tempo real;
- lote/balança/pesagem sem regra explícita.

- [ ] **Step 6: rodar teste e typecheck**

Run:

```bash
pnpm --filter @verdis/web test -- pending-page.test.tsx
pnpm --filter @verdis/web typecheck
```

Expected: PASS.

- [ ] **Step 7: commit**

```bash
git add apps/web/src/features
 git commit -m "feat(web): add M1 cooperative overview pages"
```

---

### Task 5: Conectar páginas reais às rotas e validar navegação ativa

**Files:**
- Modify: `apps/web/src/app/routes.tsx`
- Modify: `apps/web/src/app/app.test.tsx`

**Interfaces:**
- Consumes: páginas da Task 4 e `AppShell`.
- Produces: navegação completa entre as seis visões gerais.

- [ ] **Step 1: atualizar teste para validar shell + conteúdo por rota**

Substituir o teste de rota de Documentos por:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './routes'

vi.mock('@/features/scope/scope-selector', () => ({
  ScopeSelector: () => <span>Cooperativa Demo · M1 Pilot</span>,
}))

test('renders documents inside the canonical shell', () => {
  render(
    <MemoryRouter initialEntries={['/documentos']}>
      <AppRoutes />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Documentos' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('4 documentos')).toBeInTheDocument()
})
```

- [ ] **Step 2: rodar teste e confirmar falha com rotas-placeholder**

Run:

```bash
pnpm --filter @verdis/web test -- app.test.tsx
```

Expected: FAIL porque as rotas ainda usam Placeholder.

- [ ] **Step 3: substituir placeholders pelas páginas reais dentro de `AppShell`**

Estrutura:

```tsx
<Route element={<AppShell />}>
  <Route index element={<HomePage />} />
  <Route path="recebimentos" element={<ReceiptsPage />} />
  <Route path="estoque" element={<StockPage />} />
  <Route path="vendas" element={<SalesPage />} />
  <Route path="documentos" element={<DocumentsPage />} />
  <Route path="pendencias" element={<PendingPage />} />
</Route>
```

Para isso, `AppShell` deve usar `<Outlet />` quando não receber `children` explícitos em testes.

- [ ] **Step 4: rodar testes**

Run:

```bash
pnpm --filter @verdis/web test -- app.test.tsx app-shell.test.tsx pending-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add apps/web/src/app/routes.tsx apps/web/src/app/app.test.tsx apps/web/src/ui/layout/app-shell.tsx
git commit -m "feat(web): wire M1 overview routes"
```

---

### Task 6: Acessibilidade, consistência e verificação final do incremento

**Files:**
- Modify: componentes/páginas apenas onde a verificação identificar falha objetiva.
- Create: `apps/web/src/app/m1-navigation.test.tsx`

**Interfaces:**
- Produces: gate final testável para o primeiro incremento M1.

- [ ] **Step 1: criar teste de presença das seis rotas e labels principais**

Criar `m1-navigation.test.tsx` com `test.each`:

```tsx
const cases = [
  ['/', 'Início'],
  ['/recebimentos', 'Recebimentos'],
  ['/estoque', 'Estoque'],
  ['/vendas', 'Vendas'],
  ['/documentos', 'Documentos'],
  ['/pendencias', 'Pendências'],
] as const
```

Para cada caso, renderizar `AppRoutes` em `MemoryRouter` e verificar heading + link ativo correspondente.

- [ ] **Step 2: rodar suite completa**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: rodar typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS sem erros TypeScript.

- [ ] **Step 4: rodar build**

Run:

```bash
pnpm build
```

Expected: Vite build concluído com sucesso.

- [ ] **Step 5: rodar database tests para confirmar que o incremento de UI não quebrou o contrato existente**

Run em ambiente com Supabase CLI disponível:

```bash
supabase start
pnpm test:db
supabase stop --no-backup
```

Expected: PASS.

- [ ] **Step 6: inspeção manual contra Master V1.1**

Run:

```bash
pnpm dev
```

Verificar em desktop, rota por rota:

- um único shell;
- `verdis.` canônico;
- item ativo correto;
- avatar genérico;
- header idêntico;
- base neutra, não mint predominante;
- cards/botões/badges reutilizados;
- sem linguagem proibida;
- números demonstrativos coerentes entre resumo e lista.

- [ ] **Step 7: commit final do incremento**

```bash
git add apps/web/src
git commit -m "test(web): verify M1 shell and overview coverage"
```

---

## Self-review do plano

### Cobertura do spec

Este plano cobre:

- UI System V1.1 como base;
- shell global;
- autenticação/escopo existentes sem duplicação;
- navegação principal;
- seis páginas-base desktop;
- fixtures isoladas;
- semântica de Pendências e Documentos;
- testes, typecheck e build.

Ficam deliberadamente para planos separados, porque são subsistemas testáveis independentes:

1. Recebimentos — fluxo profundo + evidência + conferência + conclusão;
2. Vendas — fluxo profundo + saldo + evidência + conferência + conclusão;
3. Estoque e rastreabilidade com dados reais;
4. Pendências/Documentos integrados ao backend;
5. responsividade/mobile.

### Placeholder scan

O plano não depende de `TODO`, `TBD` ou funções indefinidas. Dados demonstrativos estão explicitamente definidos como fixtures e não como regras de produção.

### Type consistency

`AppShell`, `AppRoutes`, `MetricCard`, `StatusBadge`, `Breadcrumb`, `PageHeader` e tipos de fixtures possuem responsabilidades e assinaturas estáveis para os planos seguintes.
