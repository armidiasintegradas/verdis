# Verdis M1 — Cooperative Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a primeira experiência operacional completa da Verdis para cooperativas, permitindo receber material, comprovar, conferir, atualizar estoque, registrar venda, acompanhar documentos/pendências e reconstruir a rastreabilidade sem duplicar as regras homologadas na M0.

**Architecture:** A M1 permanece sobre o Core Supabase/PostgreSQL existente. O frontend React/TypeScript adiciona features isoladas que consomem serviços pequenos; `Movement` continua sendo a verdade operacional de massa, `current_stock`/ledger continua sendo a verdade de estoque e o Evidence Engine continua sendo a verdade de comprovação. Stitch define a experiência visual aprovada; Antigravity implementa essa experiência sem alterar silenciosamente contratos de domínio.

**Tech Stack:** React 19 + TypeScript + Vite; pnpm; Supabase Auth/PostgreSQL/Storage/RLS; `@supabase/supabase-js`; Zod; TanStack Query; Vitest + Testing Library; pgTAP/Supabase database tests; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-15-verdis-m1-cooperative-pilot-design.md`

## Global Constraints

- GitHub é a fonte da verdade para código, migrations, testes, prompts e decisões.
- Stitch pode alterar composição visual, nunca regra de domínio.
- Antigravity implementa somente a spec, o plano e a referência Stitch aprovados.
- A M1 inclui `Início | Recebimentos | Estoque | Vendas | Documentos | Pendências` e detalhe/rastreabilidade.
- Financeiro completo, associados, presença, folha/rateio, equipamentos, frota completa, contratos avançados, PGRS/RGRS, MTR/CDF automatizado e ESG expandido ficam fora da M1.
- `tenant_id`, `organization_id`, `unit_id` e `created_by` são derivados do contexto autenticado; nunca confiar nesses campos vindos de formulário.
- RLS permanece como controle final de autorização.
- Service-role key nunca aparece no browser.
- Estoque nunca é editado como número independente; é derivado do ledger.
- O arquivo original de evidência é imutável.
- `VALIDATED` e `AUDITED` permanecem estados distintos; IA nunca produz `AUDITED`.
- Não definir tolerância automática de divergência de peso nesta milestone.
- Movimentações `posted` não têm campos de massa reescritos silenciosamente.
- Nenhum mock pode permanecer em caminho de produção.

---

## File Map

### App shell e navegação
- Modify: `apps/web/package.json` — adicionar roteamento somente se necessário à implementação aprovada.
- Modify: `apps/web/src/app/app.tsx` — trocar shell técnico pelo shell operacional.
- Create: `apps/web/src/app/routes.tsx` — mapa de rotas da cooperativa.
- Create: `apps/web/src/app/app-shell.tsx` — navegação, header, escopo ativo e outlet.
- Create: `apps/web/src/app/app.css` — tokens e estilos globais derivados do Stitch; sem lógica de domínio.

### Domínio e serviços
- Create: `apps/web/src/domain/cooperative.ts` — tipos de leitura da M1 e schemas de formulário.
- Modify: `apps/web/src/services/movements/create-movement.ts` somente se um contrato reutilizável for necessário; preservar derivação segura de escopo/usuário.
- Create: `apps/web/src/services/movements/post-movement.ts` — transição controlada `draft -> posted`.
- Create: `apps/web/src/services/movements/load-movement-detail.ts` — rastreabilidade agregada para leitura.
- Create: `apps/web/src/services/cooperative/load-home-summary.ts` — métricas operacionais canônicas.
- Create: `apps/web/src/services/cooperative/load-reference-data.ts` — materiais e contrapartes do escopo.
- Create: `apps/web/src/services/documents/upload-evidence-document.ts` — hash + Storage + metadata + evidence.
- Create: `apps/web/src/services/documents/load-documents.ts` — lista documental operacional.
- Create: `apps/web/src/services/evidence/load-document-review.ts` — extração/comparação.
- Create: `apps/web/src/services/stock/load-stock.ts` — `current_stock` + material.
- Create: `apps/web/src/services/stock/load-stock-detail.ts` — histórico do material.
- Create: `apps/web/src/services/sales/create-sale.ts` — coordena `Movement` draft + `sales`, sem efeito de estoque manual.
- Create: `apps/web/src/services/pendings/load-pendings.ts` — projeção das pendências canônicas.

### Features
- Create: `apps/web/src/features/cooperative-home/*`
- Create: `apps/web/src/features/receipts/*`
- Create: `apps/web/src/features/stock/*`
- Create: `apps/web/src/features/sales/*`
- Create: `apps/web/src/features/documents/*`
- Create: `apps/web/src/features/pendings/*`
- Create: `apps/web/src/features/movement-detail/*`

### Banco, somente se necessário
- Preferir serviços sobre tabelas existentes.
- Se a projeção de pendências ficar excessivamente duplicada no cliente, create: `supabase/migrations/0011_cooperative_read_models.sql` com `security_invoker = true` e sem nova fonte de verdade.
- Test: `supabase/tests/database/0012_cooperative_read_models.test.sql`.

### Design e prompts
- Create: `docs/prompts/2026-09-15-m1-stitch-cooperative-pilot.md` — prompt mestre de UX.
- Após aprovação visual, create: `docs/prompts/2026-09-15-m1-antigravity-implementation.md` — handoff final de implementação.

---

### Task 1: Freeze the Stitch UX contract and prepare the app shell

**Files:**
- Create: `docs/prompts/2026-09-15-m1-stitch-cooperative-pilot.md`
- Modify: `apps/web/src/app/app.test.tsx`
- Create: `apps/web/src/app/routes.tsx`
- Create: `apps/web/src/app/app-shell.tsx`
- Modify: `apps/web/src/app/app.tsx`

**Interfaces:**
- Consumes: `Providers`, `useAuth`, `useScope`, `ScopeSelector`.
- Produces: route shell with paths `/`, `/recebimentos`, `/recebimentos/novo`, `/estoque`, `/estoque/:materialId`, `/vendas`, `/vendas/nova`, `/documentos`, `/pendencias`, `/movimentacoes/:movementId`.

- [ ] **Step 1: Write the failing shell test**

```tsx
import { render, screen } from '@testing-library/react'
import { App } from './app'

test('renders cooperative navigation', () => {
  render(<App />)
  expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Recebimentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Estoque' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Vendas' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Documentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Pendências' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm --filter @verdis/web test -- app.test.tsx`

Expected: FAIL because the current app only renders `Verdis Core`.

- [ ] **Step 3: Implement the minimal operational shell**

`routes.tsx` must export route metadata independent from presentation:

```ts
export const cooperativeRoutes = [
  { path: '/', label: 'Início' },
  { path: '/recebimentos', label: 'Recebimentos' },
  { path: '/estoque', label: 'Estoque' },
  { path: '/vendas', label: 'Vendas' },
  { path: '/documentos', label: 'Documentos' },
  { path: '/pendencias', label: 'Pendências' },
] as const
```

Implement routing with the smallest dependency surface. If `react-router-dom` is introduced, add it explicitly to `apps/web/package.json` and keep route state out of feature components.

- [ ] **Step 4: Apply only Stitch-approved visual tokens**

Until Stitch is approved, use semantic structure and minimal CSS. Do not invent a final color system. After approval, encode approved tokens in `app.css` as CSS custom properties and keep the official Verdis logo as an external approved asset, never AI-regenerated.

- [ ] **Step 5: Run verification**

Run: `pnpm test && pnpm typecheck && pnpm build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/prompts/2026-09-15-m1-stitch-cooperative-pilot.md apps/web/src/app apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add cooperative app shell"
```

---

### Task 2: Define M1 read models and cooperative reference data

**Files:**
- Create: `apps/web/src/domain/cooperative.ts`
- Test: `apps/web/src/domain/cooperative.test.ts`
- Create: `apps/web/src/services/cooperative/load-reference-data.ts`
- Test: `apps/web/src/services/cooperative/load-reference-data.test.ts`

**Interfaces:**
- Produces:
  - `ReceiptFormInput`
  - `SaleFormInput`
  - `CooperativeMaterialOption`
  - `CooperativeCounterpartyOption`
  - `loadCooperativeReferenceData(scope: ActiveScope)`

- [ ] **Step 1: Write domain tests**

```ts
import { receiptFormSchema, saleFormSchema } from './cooperative'

test('receipt requires origin, material and positive weight', () => {
  expect(receiptFormSchema.safeParse({
    sourceCounterpartyId: crypto.randomUUID(),
    materialId: crypto.randomUUID(),
    quantityKg: 480,
    occurredAt: new Date().toISOString(),
  }).success).toBe(true)
})

test('sale derives total and requires positive quantity and unit price', () => {
  expect(saleFormSchema.safeParse({
    buyerCounterpartyId: crypto.randomUUID(),
    materialId: crypto.randomUUID(),
    quantityKg: 200,
    unitPrice: 3.1,
    soldAt: new Date().toISOString(),
  }).success).toBe(true)
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @verdis/web test -- cooperative.test.ts`

Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement schemas and stable UI types**

```ts
export const receiptFormSchema = z.object({
  sourceCounterpartyId: z.uuid(),
  materialId: z.uuid(),
  quantityKg: z.number().positive(),
  occurredAt: z.iso.datetime(),
})

export const saleFormSchema = z.object({
  buyerCounterpartyId: z.uuid(),
  materialId: z.uuid(),
  quantityKg: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  soldAt: z.iso.datetime(),
})
```

- [ ] **Step 4: Implement scoped reference loading**

Query only `materials` and `counterparties` visible by RLS. Do not pass arbitrary tenant/org from UI payload; scope comes from `ActiveScope`.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test && pnpm typecheck`

```bash
git add apps/web/src/domain/cooperative* apps/web/src/services/cooperative
git commit -m "feat: add cooperative reference models"
```

---

### Task 3: Build the cooperative home from canonical data

**Files:**
- Create: `apps/web/src/services/cooperative/load-home-summary.ts`
- Test: `apps/web/src/services/cooperative/load-home-summary.test.ts`
- Create: `apps/web/src/features/cooperative-home/cooperative-home-page.tsx`
- Test: `apps/web/src/features/cooperative-home/cooperative-home-page.test.tsx`

**Interfaces:**
- Produces:

```ts
export type CooperativeHomeSummary = {
  receivedTodayKg: number
  soldTodayAmount: number
  currentStockKg: number
  pendingCount: number
}
```

- [ ] **Step 1: Write service test proving canonical sources**

The mocked Supabase client must verify that received volume is read from posted receipt movements, sold value from `sales` linked to posted movements and stock from `current_stock`. Do not compute stock by summing UI history.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @verdis/web test -- load-home-summary.test.ts`

- [ ] **Step 3: Implement `loadHomeSummary(scope)`**

Use the active scope for `.eq('tenant_id', ...)`, `.eq('organization_id', ...)` and unit filtering. Use local day boundaries only for presentation/query window; persisted timestamps remain UTC/timestamptz.

- [ ] **Step 4: Write the home UI test**

```tsx
expect(screen.getByRole('link', { name: /receber material/i })).toBeInTheDocument()
expect(screen.getByRole('link', { name: /registrar venda/i })).toBeInTheDocument()
expect(screen.getByText(/recebido hoje/i)).toBeInTheDocument()
expect(screen.getByText(/estoque atual/i)).toBeInTheDocument()
```

- [ ] **Step 5: Implement home with TanStack Query**

Query key must include the entire active scope:

```ts
['cooperative-home', scope.tenantId, scope.organizationId, scope.unitId]
```

- [ ] **Step 6: Run and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src/features/cooperative-home apps/web/src/services/cooperative
git commit -m "feat: add cooperative operational home"
```

---

### Task 4: Implement the receipt draft and posting workflow

**Files:**
- Create: `apps/web/src/services/movements/post-movement.ts`
- Test: `apps/web/src/services/movements/post-movement.test.ts`
- Create: `apps/web/src/features/receipts/receipt-form.tsx`
- Create: `apps/web/src/features/receipts/new-receipt-page.tsx`
- Test: `apps/web/src/features/receipts/new-receipt-page.test.tsx`

**Interfaces:**
- Consumes: `createMovement(scope, MovementDraft)`.
- Produces: `postMovement(scope: ActiveScope, movementId: string): Promise<void>`.

- [ ] **Step 1: Write posting security test**

```ts
test('posts only the requested draft inside active scope', async () => {
  await postMovement(scope, movementId)
  expect(update).toHaveBeenCalledWith({ status: 'posted' })
  expect(eq).toHaveBeenCalledWith('tenant_id', scope.tenantId)
  expect(eq).toHaveBeenCalledWith('organization_id', scope.organizationId)
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @verdis/web test -- post-movement.test.ts`

- [ ] **Step 3: Implement posting**

Update only `status`. Never send `quantity_kg`, scope fields or `created_by` during posting.

- [ ] **Step 4: Write receipt page test**

Cover origin, material, quantity, optional document step and final confirmation. A receipt without document must still call `postMovement` and finish as autodeclared.

- [ ] **Step 5: Implement receipt wizard**

Creation payload:

```ts
{
  movementType: 'receipt',
  materialId,
  quantityKg,
  occurredAt,
  sourceCounterpartyId,
}
```

The page must create a draft before evidence upload, keep `movementId` in component state and only post on final confirmation.

- [ ] **Step 6: Invalidate canonical queries after posting**

Invalidate `cooperative-home`, `stock`, `receipts` and the posted movement detail.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src/features/receipts apps/web/src/services/movements
git commit -m "feat: add cooperative receipt workflow"
```

---

### Task 5: Add evidence upload and document review without blocking operations

**Files:**
- Create: `apps/web/src/services/documents/upload-evidence-document.ts`
- Test: `apps/web/src/services/documents/upload-evidence-document.test.ts`
- Create: `apps/web/src/services/evidence/load-document-review.ts`
- Test: `apps/web/src/services/evidence/load-document-review.test.ts`
- Create: `apps/web/src/features/receipts/evidence-step.tsx`
- Create: `apps/web/src/features/receipts/document-review-step.tsx`
- Test: `apps/web/src/features/receipts/document-review-step.test.tsx`

**Interfaces:**
- Consumes: `hashFileSha256(file)` and the existing private bucket `evidence-documents`.
- Produces:

```ts
uploadEvidenceDocument(scope, movementId, file, documentType)
loadDocumentReview(movementId)
```

- [ ] **Step 1: Write upload test**

Prove path format is derived, not user supplied:

```ts
const expectedPrefix = `${scope.tenantId}/${scope.organizationId}/${movementId}/`
expect(storageUploadPath.startsWith(expectedPrefix)).toBe(true)
```

Also assert `uploaded_by` comes from `supabase.auth.getUser()`.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement upload pipeline**

Required order:

```text
hash file
→ upload Storage
→ insert documents
→ insert evidences linked to movement/document
→ return ids/status
```

If metadata insertion fails after upload, surface a recoverable error and do not fake success. Never delete a prior original to “retry”. A retry with the same SHA should surface duplicate context instead of silently creating misleading evidence.

- [ ] **Step 4: Implement asynchronous review state**

`loadDocumentReview` returns the latest extraction and evidence status if available. The UI supports `pending`, extracted data, extraction failure and no extraction yet.

- [ ] **Step 5: Write weight comparison UI test**

```tsx
expect(screen.getByText('520 kg')).toBeInTheDocument()
expect(screen.getByText('482 kg')).toBeInTheDocument()
expect(screen.getByText('38 kg')).toBeInTheDocument()
```

When user keeps declared weight after divergence, require a non-empty justification in UI state; do not mutate a posted movement.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src/services/documents apps/web/src/services/evidence apps/web/src/features/receipts
git commit -m "feat: add receipt evidence review"
```

---

### Task 6: Implement stock overview and material trace

**Files:**
- Create: `apps/web/src/services/stock/load-stock.ts`
- Create: `apps/web/src/services/stock/load-stock-detail.ts`
- Test: `apps/web/src/services/stock/load-stock.test.ts`
- Create: `apps/web/src/features/stock/stock-page.tsx`
- Create: `apps/web/src/features/stock/material-stock-page.tsx`
- Test: `apps/web/src/features/stock/stock-page.test.tsx`

**Interfaces:**
- Produces:

```ts
export type StockRow = {
  materialId: string
  materialName: string
  quantityKg: number
}
```

- [ ] **Step 1: Write query test proving use of `current_stock`**

Assert the service queries `current_stock`; a test must fail if implementation tries to maintain a browser-side balance.

- [ ] **Step 2: Implement `loadStock(scope)`**

Join/material lookup can be done through typed Supabase relations or a second scoped material query. Quantity comes only from `current_stock.quantity_kg`.

- [ ] **Step 3: Implement material detail**

Load posted movements and relevant ledger entries for that material/scope, newest first. Return inputs/outputs and timeline data without recalculating the authoritative balance.

- [ ] **Step 4: UI tests**

Verify formatted `kg`, empty state and material navigation.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src/services/stock apps/web/src/features/stock
git commit -m "feat: add cooperative stock views"
```

---

### Task 7: Implement sale creation with atomic business invariants

**Files:**
- Create: `apps/web/src/services/sales/create-sale.ts`
- Test: `apps/web/src/services/sales/create-sale.test.ts`
- Create: `apps/web/src/features/sales/new-sale-page.tsx`
- Create: `apps/web/src/features/sales/sale-form.tsx`
- Test: `apps/web/src/features/sales/new-sale-page.test.tsx`

**Interfaces:**
- Produces:

```ts
createSale(scope: ActiveScope, input: SaleFormInput): Promise<{ movementId: string; saleId: string }>
```

- [ ] **Step 1: Write failing service test**

The test must assert:

```text
create movement type=sale in draft
→ create sales row matching movement scope/material/quantity
→ post movement only after commercial row succeeds
```

If sale creation fails, the draft may remain for recovery, but stock must not change because the movement was not posted.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement service**

Use `createMovement` for the draft. Insert `sales` with seller scope derived from `ActiveScope`; never copy a client-supplied tenant/org. Use the existing generated `total_amount` rather than sending a total.

- [ ] **Step 4: Write insufficient-stock UI test**

```tsx
expect(screen.getByText(/saldo insuficiente/i)).toBeInTheDocument()
expect(screen.getByRole('button', { name: /confirmar venda/i })).toBeDisabled()
```

Frontend pre-check improves UX, but the database remains the final guard when posting.

- [ ] **Step 5: Implement sale preview**

Display available quantity, sale quantity, estimated remaining balance, price/kg and locally formatted total. The persisted total still comes from the DB-generated column.

- [ ] **Step 6: Optional fiscal document**

Reuse `uploadEvidenceDocument`; absence of document must not imply validated evidence and must be visible in Pendências.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm test:db`

```bash
git add apps/web/src/services/sales apps/web/src/features/sales
git commit -m "feat: add cooperative sale workflow"
```

---

### Task 8: Project operational pendings without creating a second issue system

**Files:**
- Create: `apps/web/src/services/pendings/load-pendings.ts`
- Test: `apps/web/src/services/pendings/load-pendings.test.ts`
- Create: `apps/web/src/features/pendings/pendings-page.tsx`
- Test: `apps/web/src/features/pendings/pendings-page.test.tsx`
- Optional only if service query becomes unmaintainable: `supabase/migrations/0011_cooperative_read_models.sql`
- Optional matching test: `supabase/tests/database/0012_cooperative_read_models.test.sql`

**Interfaces:**
- Produces:

```ts
export type CooperativePendingItem = {
  id: string
  kind: 'missing_document' | 'extraction_pending' | 'review_pending' | 'weight_divergence' | 'validation_rejected' | 'duplicate_document'
  movementId: string | null
  documentId: string | null
  title: string
  detail: string
  actionPath: string
}
```

- [ ] **Step 1: Write projection tests for canonical states**

Cover at minimum:

```text
posted receipt + no evidence => missing_document
posted sale + no fiscal/evidence document => missing_document
document extraction_status=pending => extraction_pending
weighing declared != net => weight_divergence
latest relevant validation rejected => validation_rejected
```

- [ ] **Step 2: Implement service-first projection**

Prefer typed queries over existing entities. Do not create `issues` table.

- [ ] **Step 3: Escalation rule for a database view**

Only if the client needs duplicated multi-query reconciliation in more than one feature, add an additive `security_invoker` view. It may expose derived pending rows, but no editable lifecycle fields.

Example header if needed:

```sql
create view public.cooperative_pending_items
with (security_invoker = true)
as
select ...;
```

RLS must still be inherited from underlying tables; pgTAP must prove cross-org records are absent.

- [ ] **Step 4: Implement actionable list UI**

Each item shows what happened, record, impact and one clear action link.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`; if migration exists also `pnpm test:db` and regenerate/check database types.

```bash
git add apps/web/src/services/pendings apps/web/src/features/pendings supabase/migrations supabase/tests/database apps/web/src/lib/supabase/database.types.ts
git commit -m "feat: add cooperative operational pendings"
```

---

### Task 9: Add documents list and movement traceability detail

**Files:**
- Create: `apps/web/src/services/documents/load-documents.ts`
- Test: `apps/web/src/services/documents/load-documents.test.ts`
- Create: `apps/web/src/services/movements/load-movement-detail.ts`
- Test: `apps/web/src/services/movements/load-movement-detail.test.ts`
- Create: `apps/web/src/features/documents/documents-page.tsx`
- Create: `apps/web/src/features/movement-detail/movement-detail-page.tsx`
- Test: `apps/web/src/features/movement-detail/movement-detail-page.test.tsx`

**Interfaces:**
- `loadDocuments(scope)` returns only scoped metadata and signed/private access actions when requested.
- `loadMovementDetail(scope, movementId)` returns movement, weighing, evidence, document/extraction metadata, validation, sale/ledger effect and audit timeline visible under current RLS.

- [ ] **Step 1: Write movement-detail service test**

Assert all queries include the target id and remain scoped. The returned shape must not accept a caller-provided `organizationId` separate from `ActiveScope`.

- [ ] **Step 2: Implement document list**

Show original filename, type, upload date, extraction status and movement relation. Do not expose raw storage paths as public URLs.

- [ ] **Step 3: Implement traceability narrative**

Render a chronological human-readable sequence such as:

```text
Recebimento criado
Ticket anexado
Extração processada
Recebimento confirmado
+480 kg no estoque
```

For a sale include commercial information and stock effect. `audit_events` remain append-only data; UI is a projection.

- [ ] **Step 4: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src/services/documents apps/web/src/services/movements apps/web/src/features/documents apps/web/src/features/movement-detail
git commit -m "feat: add documents and movement traceability"
```

---

### Task 10: Apply the approved Stitch visual system and interaction states

**Files:**
- Modify: `apps/web/src/app/app.css`
- Modify: all M1 feature components only where needed to match approved Stitch output.
- Create: `docs/verification/m1-stitch-acceptance.md`

**Interfaces:**
- Consumes: approved Stitch screens/states from `docs/prompts/2026-09-15-m1-stitch-cooperative-pilot.md`.
- Produces: desktop/tablet/mobile implementation with the same information architecture and flows.

- [ ] **Step 1: Record approved Stitch decisions**

Document actual approved spacing, typography hierarchy, navigation behavior, responsive behavior, button hierarchy and component states. Do not record invented tokens not present in the approved output.

- [ ] **Step 2: Implement semantic states**

Every critical action needs visible states for loading, saving, uploading, processing, failure, lack of permission, insufficient stock and completed.

- [ ] **Step 3: Add accessibility regression tests**

At minimum verify explicit form labels, accessible action names and textual error messages. Essential actions cannot depend on color/hover only.

- [ ] **Step 4: Responsive manual verification**

Check desktop, tablet and mobile widths. On mobile, `Receber material` and `Registrar venda` remain reachable with at most one action from home.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src docs/verification/m1-stitch-acceptance.md
git commit -m "feat: apply approved M1 cooperative experience"
```

---

### Task 11: Add end-to-end pilot regression coverage

**Files:**
- Create: `supabase/tests/database/0013_m1_cooperative_pilot.test.sql`
- Create: `apps/web/src/test/m1-pilot-flow.test.tsx` or equivalent integration test at the highest stable frontend boundary.
- Modify: `.github/workflows/ci.yml` only if an additional explicit command is needed; otherwise reuse existing gates.

**Interfaces:**
- Produces: automated proof of the M1 homologation path.

- [ ] **Step 1: Write database pilot test**

The pgTAP scenario must create or reuse deterministic fixtures and prove:

```text
receipt 480 kg draft
→ post
→ stock +480
→ sale 200 kg draft + sales row
→ post
→ stock 280
→ audit events exist
→ another organization cannot read the records
```

Also preserve existing evidence/security tests.

- [ ] **Step 2: Verify database RED before adding any supporting migration/function**

Run: `pnpm test:db`

Any needed database change must be additive and justified by this failing behavior, not by UI convenience.

- [ ] **Step 3: Add frontend pilot integration test**

Test user-facing actions with mocked service boundaries: home action → receipt flow → success → stock → sale flow → remaining stock → movement detail. Do not mock domain calculations in a way that proves a false backend state; service unit tests and pgTAP own those guarantees.

- [ ] **Step 4: Full gate**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
supabase start
supabase test db
supabase gen types typescript --local > /tmp/verdis-database.types.ts
diff -u apps/web/src/lib/supabase/database.types.ts /tmp/verdis-database.types.ts
supabase stop --no-backup
```

Expected: all PASS / no diff.

- [ ] **Step 5: Commit**

```bash
git add supabase/tests apps/web/src/test .github/workflows/ci.yml apps/web/src/lib/supabase/database.types.ts
git commit -m "test: cover M1 cooperative pilot end to end"
```

---

### Task 12: Version the Antigravity handoff and prepare the draft PR

**Files:**
- Create: `docs/prompts/2026-09-15-m1-antigravity-implementation.md`
- Create/Modify: `docs/verification/m1-cooperative-pilot.md`

**Interfaces:**
- Consumes: approved spec, this plan, approved Stitch artifacts/acceptance notes, green CI.
- Produces: reproducible Antigravity execution contract and review evidence.

- [ ] **Step 1: Write the Antigravity prompt**

It must require reading, in order:

```text
docs/product/PRD.md
docs/superpowers/specs/2026-09-15-verdis-core-foundation-design.md
docs/superpowers/specs/2026-09-15-verdis-m1-cooperative-pilot-design.md
docs/superpowers/plans/2026-09-15-verdis-m1-cooperative-pilot.md
docs/verification/m1-stitch-acceptance.md
relevant migrations and tests
```

It must explicitly prohibit weakening RLS, rewriting published migrations, changing brand assets, introducing mock production data or broadening the milestone.

- [ ] **Step 2: Record verification evidence**

`docs/verification/m1-cooperative-pilot.md` records exact commit SHA, commands and outcomes, without claiming tests that were not run.

- [ ] **Step 3: Open draft PR**

PR title: `M1: Cooperative Pilot`.

PR body must list functional scope, any additive DB changes, Stitch approval reference, security invariants and CI evidence.

- [ ] **Step 4: Keep PR draft until full review**

Do not merge to `main` merely because visual screens are present. The gate is functional end-to-end behavior + green CI + explicit authorization.

---

## Plan Self-Review

**Spec coverage:** home, receipt, evidence/review, stock, sale, documents, pendings, traceability, loading/error states, responsiveness, security and E2E are each mapped to explicit tasks.

**Database scope:** no new mutable issue system is planned. A `security_invoker` read model is conditional and only introduced if repeated projection logic justifies it.

**Type consistency:** all security-sensitive services consume `ActiveScope`; form types exclude tenant/org/creator fields; `createSale` persists no independent total; stock reads from `current_stock`.

**No placeholder decisions:** tolerance for weight divergence remains intentionally absent per spec; it is not delegated to implementation. Stitch visual values are also not invented before visual approval.
