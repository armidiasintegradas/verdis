# VERDIS M1 Receipts Deep Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo persistente de Recebimentos do M1, de rascunho até confirmação, com documento/evidência, divergência, decisão humana, retomada após refresh e efeito de estoque somente em `draft → posted`.

**Architecture:** O frontend persiste apenas fatos duráveis e mantém em memória estados transitórios do wizard. O upload grava o objeto no Storage e chama um RPC atômico para criar `documents + evidences`; a conferência consome extrações quando elas existirem; o RPC `confirm_receipt_m1` registra a decisão aplicável, atualiza a quantidade adotada antes do `posted` e deixa o trigger existente produzir o ledger. O produtor externo de IA/OCR não faz parte deste incremento: este slice apenas expõe e consome corretamente `document_extractions`/`evidences.extracted_fields` quando o pipeline assíncrono os preencher.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Supabase JS 2.57, PostgreSQL/Supabase, TanStack React Query 5, Zod 4, Vitest 3, Testing Library, pgTAP/Supabase DB tests, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-16-m1-receipts-deep-flow-design.md`

## Global Constraints

- Preservar o `VERDIS UI SYSTEM V1.1`; não criar shell, paleta, família de componentes ou vocabulário paralelo.
- O recebimento nasce como `movement_type = 'receipt'` e `status = 'draft'`.
- O arquivo original é armazenado no bucket privado `evidence-documents` e nunca é silenciosamente substituído.
- `Documento processado` e `divergência operacional` são dimensões independentes.
- Extração automática nunca sobrescreve o valor originalmente informado.
- `SELECTED`, `UPLOADING` e erro momentâneo de rede são estados locais da UI, não colunas de domínio.
- Divergência exige decisão explícita; `keep_registered` em divergência exige justificativa não vazia.
- `registered_only` confirma com o dado registrado sem criar uma `validation` de divergência e sem elevar artificialmente o nível de evidência.
- Somente `draft → posted` produz efeito de estoque; o frontend nunca insere diretamente em `stock_ledger_entries`.
- A confirmação usa exatamente o RPC `confirm_receipt_m1` e deve rejeitar segunda confirmação.
- A criação de documento + evidência usa exatamente o RPC `register_receipt_evidence_document` para evitar documento órfão quando o vínculo falhar.
- Processamento documental normal não gera pendência.
- Não adicionar biblioteca de roteamento. O router interno atual será estendido para expor `pathname + search` e suportar um único parâmetro `:movementId`.
- O bootstrap de um novo recebimento usa `/recebimentos/novo?step=dados`; depois que o primeiro `movement` é criado, a URL passa para `/recebimentos/novo/:movementId?step=comprovacao`.
- A URL preserva a intenção de navegação no refresh, mas fatos persistidos sempre limitam quais passos são permitidos. Movimento `posted` sempre força `concluir`.
- O produtor assíncrono de extração/IA é explicitamente fora do escopo deste incremento. Os testes de divergência inserem `document_extractions` e atualizam `evidences.extracted_fields` como fixture de pipeline concluído.
- Cada tarefa segue TDD: teste falha → implementação mínima → teste passa → suíte relevante → commit.

---

## File Map

### Banco
- Create: `supabase/migrations/0011_m1_receipts_deep_flow.sql`
- Create: `supabase/tests/database/0012_m1_receipts_deep_flow.test.sql`
- Regenerate: `apps/web/src/lib/supabase/database.types.ts`

### Domínio e serviços
- Create: `apps/web/src/domain/receipt-flow.ts`
- Test: `apps/web/src/domain/receipt-flow.test.ts`
- Create: `apps/web/src/services/receipts/receipt-draft-service.ts`
- Test: `apps/web/src/services/receipts/receipt-draft-service.test.ts`
- Create: `apps/web/src/services/documents/upload-receipt-evidence.ts`
- Test: `apps/web/src/services/documents/upload-receipt-evidence.test.ts`
- Create: `apps/web/src/services/receipts/receipt-conference-service.ts`
- Test: `apps/web/src/services/receipts/receipt-conference-service.test.ts`
- Create: `apps/web/src/services/receipts/confirm-receipt-service.ts`
- Test: `apps/web/src/services/receipts/confirm-receipt-service.test.ts`

### UI / routing
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/app/routes.tsx`
- Modify: `apps/web/src/app/m1-navigation.test.tsx`
- Modify: `apps/web/src/features/receipts/receipts-page.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-stepper.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-data-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-evidence-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-conference-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-complete-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-flow.css`
- Test: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.test.tsx`

---

### Task 1: Domínio puro do fluxo

**Files:**
- Create: `apps/web/src/domain/receipt-flow.ts`
- Test: `apps/web/src/domain/receipt-flow.test.ts`

**Produces:**

```ts
export type ReceiptDecision = 'registered_only' | 'use_document' | 'keep_registered'
export type ReceiptConferenceState = 'processing' | 'match' | 'divergence'
export type ReceiptStep = 'dados' | 'comprovacao' | 'conferencia' | 'concluir'

export function calculateQuantityDifference(
  registeredKg: number,
  documentKg: number,
): { absoluteKg: number; percent: number }

export function deriveConferenceState(input: {
  extractionFinished: boolean
  registeredKg: number
  documentKg: number | null
}): ReceiptConferenceState

export function requiresReceiptJustification(
  decision: ReceiptDecision,
  hasDivergence: boolean,
): boolean

export function allowedReceiptStep(input: {
  requestedStep: ReceiptStep
  movementStatus: 'draft' | 'posted' | 'voided' | null
  hasDocument: boolean
  extractionFinished: boolean
  hasDivergence: boolean
}): ReceiptStep
```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  allowedReceiptStep,
  calculateQuantityDifference,
  deriveConferenceState,
  requiresReceiptJustification,
} from './receipt-flow'

describe('receipt flow domain', () => {
  it('calculates 480kg x 482kg', () => {
    expect(calculateQuantityDifference(480, 482)).toEqual({
      absoluteKg: 2,
      percent: 0.4166666666666667,
    })
  })

  it('stays processing without extracted quantity', () => {
    expect(deriveConferenceState({
      extractionFinished: false,
      registeredKg: 480,
      documentKg: null,
    })).toBe('processing')
  })

  it('derives divergence from processed values', () => {
    expect(deriveConferenceState({
      extractionFinished: true,
      registeredKg: 480,
      documentKg: 482,
    })).toBe('divergence')
  })

  it('requires justification only for keep_registered divergence', () => {
    expect(requiresReceiptJustification('keep_registered', true)).toBe(true)
    expect(requiresReceiptJustification('use_document', true)).toBe(false)
    expect(requiresReceiptJustification('registered_only', false)).toBe(false)
  })

  it('forces posted movements to concluir regardless of requested query step', () => {
    expect(allowedReceiptStep({
      requestedStep: 'dados',
      movementStatus: 'posted',
      hasDocument: true,
      extractionFinished: true,
      hasDivergence: true,
    })).toBe('concluir')
  })

  it('allows conferencia for a draft without document when URL already records that choice', () => {
    expect(allowedReceiptStep({
      requestedStep: 'conferencia',
      movementStatus: 'draft',
      hasDocument: false,
      extractionFinished: false,
      hasDivergence: false,
    })).toBe('conferencia')
  })

  it('does not allow concluir for an unposted draft', () => {
    expect(allowedReceiptStep({
      requestedStep: 'concluir',
      movementStatus: 'draft',
      hasDocument: false,
      extractionFinished: false,
      hasDivergence: false,
    })).toBe('conferencia')
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter @verdis/web test -- src/domain/receipt-flow.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement minimal pure functions**

Rules for `allowedReceiptStep`:

```text
movementStatus = posted|voided -> concluir
movementStatus = null -> dados
requested concluir on draft -> conferencia
requested conferencia on draft -> conferencia
requested comprovacao on draft -> comprovacao
requested dados on draft -> dados
```

Do not infer an extraction that is not present.

- [ ] **Step 4: Verify GREEN + typecheck**

```bash
pnpm --filter @verdis/web test -- src/domain/receipt-flow.test.ts
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domain/receipt-flow.ts apps/web/src/domain/receipt-flow.test.ts
git commit -m "feat(receipts): add receipt flow domain rules"
```

---

### Task 2: Banco — registro atômico de documento/evidência e confirmação do recebimento

**Files:**
- Create: `supabase/migrations/0011_m1_receipts_deep_flow.sql`
- Create: `supabase/tests/database/0012_m1_receipts_deep_flow.test.sql`
- Regenerate: `apps/web/src/lib/supabase/database.types.ts`

**Produces RPC 1:**

```sql
public.register_receipt_evidence_document(
  p_movement_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_sha256 text,
  p_storage_path text,
  p_claimed_quantity_kg numeric
) returns table(document_id uuid, evidence_id uuid)
```

**Produces RPC 2:**

```sql
public.confirm_receipt_m1(
  p_movement_id uuid,
  p_decision text,
  p_evidence_id uuid default null,
  p_reason text default null
) returns table(
  movement_id uuid,
  adopted_quantity_kg numeric,
  previous_stock_kg numeric,
  new_stock_kg numeric
)
```

- [ ] **Step 1: Write failing pgTAP tests before migration**

The fixture must create an authenticated actor with `movement.create`, `movement.read`, `evidence.upload`, `evidence.read`; create one `receipt` draft at `480kg`; and assert both RPCs do not exist yet.

Add exact behavior tests:

```sql
-- register RPC creates both durable rows in one transaction
select lives_ok(
  $$ select * from public.register_receipt_evidence_document(
    :'receipt_id'::uuid,
    'Ticket_009182.jpg',
    'image/jpeg',
    repeat('a', 64),
    :'tenant_id' || '/' || :'org_id' || '/' || :'receipt_id' || '/ticket.jpg',
    480
  ) $$,
  'document/evidence registration succeeds'
);

select is(
  (select count(*)::int from public.documents where original_filename='Ticket_009182.jpg'),
  1,
  'document exists'
);

select is(
  (select count(*)::int from public.evidences where movement_id=:'receipt_id'::uuid),
  1,
  'evidence link exists'
);
```

Seed processed divergence by inserting a `document_extractions` row for the linked document and updating that evidence to `extracted_fields = '{"quantity_kg":482}'`.

Then assert:

```sql
select throws_ok(
  $$ select * from public.confirm_receipt_m1(
    :'receipt_id'::uuid,
    'keep_registered',
    :'evidence_id'::uuid,
    null
  ) $$,
  '.*justification.*',
  'keep_registered divergence requires justification'
);
```

Create independent receipts for each confirmation path:

```text
A registered_only, no evidence -> posted 480, ledger +480, zero operator_resolution validations
B use_document, evidence 482 -> movement 482 then posted, ledger +482, validation rule RECEIPT_USE_DOCUMENT_QUANTITY
C keep_registered, evidence 482 + reason -> movement 480 posted, ledger +480, validation rule RECEIPT_KEEP_REGISTERED_QUANTITY + reason
D second confirmation on posted receipt -> rejected, ledger count remains 1
E use_document with evidence but no document_extractions row -> rejected
F evidence belonging to another movement -> rejected
```

- [ ] **Step 2: Verify RED**

```bash
supabase start
supabase test db
```

Expected: new test fails because RPCs do not exist.

- [ ] **Step 3: Implement `register_receipt_evidence_document`**

Required checks:

```text
auth.uid() exists
movement exists, movement_type receipt, status draft
movement scope matches storage path tenant/org prefixes
actor has movement.read + evidence.upload for movement scope
sha256 matches ^[0-9a-f]{64}$
claimed quantity > 0
```

Inside one PostgreSQL transaction/function call:

```sql
insert into public.documents (
  tenant_id, organization_id, uploaded_by, document_type,
  original_filename, mime_type, sha256, storage_bucket, storage_path,
  extraction_status
) values (
  v_movement.tenant_id, v_movement.organization_id, v_user_id,
  'receipt_evidence', p_original_filename, p_mime_type, p_sha256,
  'evidence-documents', p_storage_path, 'pending'
) returning id into v_document_id;

insert into public.evidences (
  movement_id, document_id, evidence_type,
  claimed_fields, extracted_fields, status, created_by
) values (
  p_movement_id, v_document_id, 'receipt_document',
  jsonb_build_object('quantity_kg', p_claimed_quantity_kg),
  '{}'::jsonb, 'pending', v_user_id
) returning id into v_evidence_id;
```

Return both IDs. Grant execute only to `authenticated`.

- [ ] **Step 4: Implement `confirm_receipt_m1`**

Required sequence:

```text
1 auth.uid() present
2 SELECT movement FOR UPDATE
3 movement is receipt + draft
4 actor has movement.create in exact scope
5 decision in registered_only|use_document|keep_registered
6 registered_only: p_evidence_id must be null; do not create validation
7 use_document|keep_registered:
   - evidence belongs to movement
   - evidence has document_id
   - at least one document_extractions row exists for that document
   - extracted_fields.quantity_kg exists and > 0
8 keep_registered with different quantity requires nonblank reason
9 read previous stock
10 use_document updates draft quantity before posting
11 divergence decisions insert accepted operator_resolution validation
12 update movement status posted
13 trigger creates ledger
14 return adopted quantity, previous stock, new stock
```

Validation insert only for `use_document` or `keep_registered`:

```sql
insert into public.validations (
  movement_id, evidence_id, document_id,
  validation_type, status, automated, actor_user_id, rule_code, reason
) values (
  p_movement_id,
  v_evidence.id,
  v_evidence.document_id,
  'operator_resolution',
  'accepted',
  false,
  v_user_id,
  case p_decision
    when 'use_document' then 'RECEIPT_USE_DOCUMENT_QUANTITY'
    else 'RECEIPT_KEEP_REGISTERED_QUANTITY'
  end,
  nullif(btrim(coalesce(p_reason,'')), '')
);
```

`registered_only` posts without a validation row so an autodeclared receipt does not become `VALIDATED` merely because the operator confirmed it.

- [ ] **Step 5: Verify DB GREEN**

```bash
supabase test db
```

Expected: all DB tests pass.

- [ ] **Step 6: Regenerate DB types and verify generated contract**

```bash
supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts
pnpm --filter @verdis/web typecheck
```

Verify generated types contain both functions with exact argument names.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0011_m1_receipts_deep_flow.sql \
  supabase/tests/database/0012_m1_receipts_deep_flow.test.sql \
  apps/web/src/lib/supabase/database.types.ts
git commit -m "feat(receipts): add durable evidence and receipt confirmation rpcs"
```

---

### Task 3: Serviço de rascunho de Recebimento

**Files:**
- Create: `apps/web/src/services/receipts/receipt-draft-service.ts`
- Test: `apps/web/src/services/receipts/receipt-draft-service.test.ts`
- Reuse unchanged: `apps/web/src/services/movements/create-movement.ts`

**Produces:**

```ts
export type ReceiptDraftInput = {
  materialId: string
  quantityKg: number
  occurredAt: string
  sourceCounterpartyId: string | null
}

export type ReceiptDraftRecord = ReceiptDraftInput & {
  id: string
  status: 'draft' | 'posted' | 'voided'
}

export async function createReceiptDraft(
  scope: ActiveScope,
  input: ReceiptDraftInput,
): Promise<{ id: string }>

export async function updateReceiptDraft(
  movementId: string,
  scope: ActiveScope,
  input: ReceiptDraftInput,
): Promise<void>

export async function getReceiptDraft(
  movementId: string,
  scope: ActiveScope,
): Promise<ReceiptDraftRecord>
```

- [ ] **Step 1: Write RED tests with mocked Supabase/createMovement**

Assertions:

```ts
expect(createMovement).toHaveBeenCalledWith(scope, {
  movementType: 'receipt',
  materialId: input.materialId,
  quantityKg: input.quantityKg,
  occurredAt: input.occurredAt,
  sourceCounterpartyId: input.sourceCounterpartyId,
})
```

Update query must filter exact `id`, tenant/org/unit scope, `movement_type='receipt'`, `status='draft'`.

Load query must also scope by tenant/org/unit and select only wizard fields.

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter @verdis/web test -- src/services/receipts/receipt-draft-service.test.ts
```

- [ ] **Step 3: Implement service**

Create delegates to existing `createMovement`. Update changes only material, quantity, occurred_at and source_counterparty_id. Load returns a typed record or throws `Receipt draft not found`.

Do not write workflow-step columns and do not post the movement here.

- [ ] **Step 4: Verify GREEN + typecheck**

```bash
pnpm --filter @verdis/web test -- src/services/receipts/receipt-draft-service.test.ts
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/receipts/receipt-draft-service.ts \
  apps/web/src/services/receipts/receipt-draft-service.test.ts
git commit -m "feat(receipts): persist receipt drafts"
```

---

### Task 4: Serviço de upload com rollback de objeto quando o registro falhar

**Files:**
- Create: `apps/web/src/services/documents/upload-receipt-evidence.ts`
- Test: `apps/web/src/services/documents/upload-receipt-evidence.test.ts`
- Reuse: `apps/web/src/services/documents/hash-file.ts`

**Produces:**

```ts
export async function uploadReceiptEvidence(input: {
  scope: ActiveScope
  movementId: string
  file: File
  claimedQuantityKg: number
}): Promise<{
  documentId: string
  evidenceId: string
  originalFilename: string
}>
```

- [ ] **Step 1: Write RED tests**

Cover exact sequence:

```text
hash file
get authenticated user
build path tenant/org/movement/random-safe-filename
upload to evidence-documents with upsert false
call register_receipt_evidence_document RPC
return ids
```

Failure behavior:

```text
storage upload fails -> RPC is never called
RPC fails after storage upload -> storage.remove([path]) is called once
no movement update is ever issued by this service
```

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter @verdis/web test -- src/services/documents/upload-receipt-evidence.test.ts
```

- [ ] **Step 3: Implement**

Use `hashFile(file)` and sanitize filename to letters/numbers/dot/dash/underscore. Path:

```ts
`${scope.tenantId}/${scope.organizationId}/${input.movementId}/${crypto.randomUUID()}-${safeFilename}`
```

After successful Storage upload:

```ts
const { data, error } = await supabase.rpc('register_receipt_evidence_document', {
  p_movement_id: input.movementId,
  p_original_filename: input.file.name,
  p_mime_type: input.file.type || 'application/octet-stream',
  p_sha256: sha256,
  p_storage_path: path,
  p_claimed_quantity_kg: input.claimedQuantityKg,
})
```

If the RPC throws/returns error, call Storage `.remove([path])`, then rethrow the registration error. Do not create `documents` directly in TypeScript.

- [ ] **Step 4: Verify GREEN + typecheck**

```bash
pnpm --filter @verdis/web test -- src/services/documents/upload-receipt-evidence.test.ts
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/documents/upload-receipt-evidence.ts \
  apps/web/src/services/documents/upload-receipt-evidence.test.ts
git commit -m "feat(receipts): upload receipt evidence safely"
```

---

### Task 5: Conferência e adapter de confirmação

**Files:**
- Create: `apps/web/src/services/receipts/receipt-conference-service.ts`
- Test: `apps/web/src/services/receipts/receipt-conference-service.test.ts`
- Create: `apps/web/src/services/receipts/confirm-receipt-service.ts`
- Test: `apps/web/src/services/receipts/confirm-receipt-service.test.ts`

**Produces:**

```ts
export type ReceiptConferenceViewModel = {
  movementId: string
  registeredQuantityKg: number
  documentQuantityKg: number | null
  state: 'processing' | 'match' | 'divergence'
  differenceKg: number | null
  differencePercent: number | null
  evidenceId: string | null
  document: null | {
    id: string
    filename: string
    extractionStatus: 'pending' | 'accepted' | 'rejected' | 'needs_review'
  }
}

export async function loadReceiptConference(
  movementId: string,
  scope: ActiveScope,
): Promise<ReceiptConferenceViewModel>

export async function confirmReceipt(input: {
  movementId: string
  decision: ReceiptDecision
  evidenceId: string | null
  reason: string | null
}): Promise<{
  movementId: string
  adoptedQuantityKg: number
  previousStockKg: number
  newStockKg: number
}>
```

- [ ] **Step 1: Write RED conference tests**

Scenarios:

```text
document exists + no extraction -> processing, no documentQuantityKg
evidence extracted 480 vs registered 480 -> match
evidence extracted 482 vs registered 480 -> divergence, +2, +0.4166...
no document -> processing view model is not fabricated; evidenceId null
```

The service must query movement in active scope, then latest linked evidence/document. It may read latest `document_extractions` only to decide `extractionFinished`; numeric comparison comes from `evidences.extracted_fields.quantity_kg` so the UI consumes the reconciled evidence representation rather than provider raw JSON.

- [ ] **Step 2: Write RED confirmation adapter tests**

```ts
expect(supabase.rpc).toHaveBeenCalledWith('confirm_receipt_m1', {
  p_movement_id: movementId,
  p_decision: 'keep_registered',
  p_evidence_id: evidenceId,
  p_reason: 'Quantidade operacional confirmada.',
})
```

Assert the adapter performs no direct movement or stock mutation.

- [ ] **Step 3: Verify RED**

```bash
pnpm --filter @verdis/web test -- \
  src/services/receipts/receipt-conference-service.test.ts \
  src/services/receipts/confirm-receipt-service.test.ts
```

- [ ] **Step 4: Implement both services with Task 1 helpers**

`loadReceiptConference` returns `processing` whenever there is no actual extraction result. `confirmReceipt` only calls the RPC and normalizes numeric return values to JS numbers.

- [ ] **Step 5: Verify GREEN + typecheck**

```bash
pnpm --filter @verdis/web test -- \
  src/services/receipts/receipt-conference-service.test.ts \
  src/services/receipts/confirm-receipt-service.test.ts
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/services/receipts/receipt-conference-service.ts \
  apps/web/src/services/receipts/receipt-conference-service.test.ts \
  apps/web/src/services/receipts/confirm-receipt-service.ts \
  apps/web/src/services/receipts/confirm-receipt-service.test.ts
git commit -m "feat(receipts): add conference and confirmation services"
```

---

### Task 6: Router com query string e parâmetro de movimento

**Files:**
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/app/routes.tsx`
- Modify/Test: `apps/web/src/app/m1-navigation.test.tsx`

**Produces router interface:**

```ts
type RouterContextValue = {
  pathname: string
  search: string
  navigate: (to: string) => void
}
```

**Route parsing contract:**

```ts
export function matchReceiptFlowPath(pathname: string): { movementId: string | null } | null
```

Matches exactly:

```text
/recebimentos/novo             -> { movementId: null }
/recebimentos/novo/<uuid/text> -> { movementId: '<segment>' }
```

- [ ] **Step 1: Write RED router/navigation tests**

Assert:

```text
RouterProvider initialPath='/recebimentos/novo?step=dados' exposes pathname '/recebimentos/novo' and search '?step=dados'
navigate('/recebimentos/novo/abc?step=comprovacao') updates both pathname and search
popstate reads window.location.pathname + window.location.search
AppRoutes renders ReceiptFlowPage for bootstrap and movement routes
```

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter @verdis/web test -- src/app/m1-navigation.test.tsx
```

- [ ] **Step 3: Modify `router.tsx` deterministically**

Store `{ pathname, search }` in state. Parse `initialPath` with `new URL(initialPath, 'http://verdis.local')`; parse browser state from `window.location.pathname` and `window.location.search`; `navigate(to)` uses `new URL(to, window.location.origin)` before `history.pushState`.

- [ ] **Step 4: Modify `routes.tsx`**

Before switch, call `matchReceiptFlowPath(pathname)`. When matched, render:

```tsx
<ReceiptFlowPage movementId={match.movementId} />
```

Normal `/recebimentos` continues rendering `ReceiptsPage`.

- [ ] **Step 5: Verify GREEN + typecheck**

```bash
pnpm --filter @verdis/web test -- src/app/m1-navigation.test.tsx
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/router.tsx apps/web/src/app/routes.tsx apps/web/src/app/m1-navigation.test.tsx
git commit -m "feat(receipts): route receipt wizard with search state"
```

---

### Task 7: UI do wizard completo REC-03A → REC-05

**Files:**
- Create all files under: `apps/web/src/features/receipts/receipt-flow/`
- Modify: `apps/web/src/features/receipts/receipts-page.tsx`
- Test: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.test.tsx`

**Local upload state:**

```ts
type UploadUiState =
  | { kind: 'none' }
  | { kind: 'selected'; file: File }
  | { kind: 'uploading'; file: File; progress: number | null }
  | { kind: 'failed'; file: File; message: string }
```

- [ ] **Step 1: Write RED page tests with service mocks**

Exact scenarios:

```ts
it('starts at Dados from /recebimentos/novo?step=dados')
it('creates a draft on first Dados continue and navigates to :id?step=comprovacao')
it('keeps normal CONTINUAR disabled after file selection until upload succeeds')
it('keeps draft values after upload failure')
it('allows CONTINUAR SEM DOCUMENTO to conference')
it('shows only registered values while extraction is processing')
it('renders 480 vs 482 with no decision preselected')
it('requires nonblank justification for keep_registered')
it('allows use_document without justification')
it('renders previous stock + adopted quantity = new stock after confirmation')
it('forces posted movement to Concluir even if query asks for dados')
```

- [ ] **Step 2: Verify RED**

```bash
pnpm --filter @verdis/web test -- src/features/receipts/receipt-flow/receipt-flow-page.test.tsx
```

- [ ] **Step 3: Implement stepper and frame**

Stepper copy exactly:

```text
1 Dados
2 Comprovação
3 Conferência
4 Concluir
```

Reuse global `Breadcrumb`, `PageHeader`, `Button`, cards, badges and tokens. `receipt-flow.css` may define layout only; it must reference existing CSS variables and must not redefine brand tokens.

- [ ] **Step 4: Implement Dados**

Fields:

```text
Origem
Material
Peso/quantidade
Data e hora
```

Bootstrap route has `movementId=null`. On first CONTINUAR call `createReceiptDraft`, then:

```ts
navigate(`/recebimentos/novo/${id}?step=comprovacao`)
```

Existing draft calls `updateReceiptDraft`.

- [ ] **Step 5: Implement Comprovação states**

`none`:

```text
TIRAR FOTO
ENVIAR ARQUIVO
CONTINUAR SEM DOCUMENTO
```

`selected`:

```text
filename/type/size
Pronto para enviar
ENVIAR DOCUMENTO
normal CONTINUAR disabled
```

`uploading`:

```text
Enviando
progress when API exposes one, otherwise indeterminate state
all conflicting actions disabled
```

`failed`:

```text
Falha no envio
TENTAR NOVAMENTE
Trocar arquivo
Tirar outra foto
CONTINUAR SEM DOCUMENTO
```

After successful `uploadReceiptEvidence`, refetch durable conference data and render `Documento enviado` / `Processando`, with `VISUALIZAR DOCUMENTO` and `CONTINUAR`.

`CONTINUAR SEM DOCUMENTO` navigates to `?step=conferencia`; query state survives refresh and the conference view uses `registered_only`.

- [ ] **Step 6: Implement Conferência**

Processing/no document:

```text
show registered data only
no extracted values
CONFIRMAR RECEBIMENTO -> decision registered_only
```

Divergence example:

```text
Informado 480 kg
Documento 482 kg
Diferença +2 kg / +0,42%
USAR 482 KG
MANTER 480 KG
```

Neither decision is preselected. `keep_registered` shows a required textarea; CTA disabled while `reason.trim().length === 0`.

- [ ] **Step 7: Implement Concluir**

Use `confirmReceipt` response as source for:

```text
quantidade final adotada
saldo anterior
entrada confirmada
novo saldo
```

Keep in page state the last conference decision/reason for immediate post-confirmation rendering. If the page is reloaded after posted, load durable movement/evidence/validation data before rendering Concluir so the result does not depend on volatile state.

Actions:

```text
VER MOVIMENTAÇÃO
RECEBER OUTRO MATERIAL
```

- [ ] **Step 8: Wire CTA from Receipts overview**

`+ RECEBER MATERIAL` must use `RouterLink` or router `navigate` to:

```text
/recebimentos/novo?step=dados
```

- [ ] **Step 9: Verify GREEN + web suite**

```bash
pnpm --filter @verdis/web test -- src/features/receipts/receipt-flow/receipt-flow-page.test.tsx
pnpm --filter @verdis/web test
pnpm --filter @verdis/web typecheck
pnpm --filter @verdis/web build
```

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/features/receipts/receipt-flow \
  apps/web/src/features/receipts/receipts-page.tsx
git commit -m "feat(receipts): implement persistent receipt wizard"
```

---

### Task 8: Full regression, generated contract and CI gate

**Files:**
- Modify only for test coverage gaps: `supabase/tests/database/0012_m1_receipts_deep_flow.test.sql`
- Regenerate only if schema changed since Task 2: `apps/web/src/lib/supabase/database.types.ts`
- No new production interface in this task.

- [ ] **Step 1: Fresh DB verification**

```bash
supabase start
supabase test db
```

Expected: all tests pass, including paths A–F from Task 2.

- [ ] **Step 2: Verify generated TypeScript contract exactly**

```bash
supabase gen types typescript --local > /tmp/verdis-database.types.ts
diff -u apps/web/src/lib/supabase/database.types.ts /tmp/verdis-database.types.ts
```

Expected: no diff.

- [ ] **Step 3: Fresh web verification**

```bash
pnpm --filter @verdis/web test
pnpm --filter @verdis/web typecheck
pnpm --filter @verdis/web build
```

Expected: zero failed tests; typecheck and build exit 0.

- [ ] **Step 4: Spec acceptance checklist**

```text
[ ] REC-03A Dados
[ ] REC-03B Comprovação vazio
[ ] REC-03C arquivo selecionado
[ ] REC-03D enviando
[ ] REC-03E enviado/processando
[ ] REC-03F falha
[ ] REC-04A conferência/processando
[ ] REC-04B divergência 480/482
[ ] REC-04C justificativa
[ ] REC-05 conclusão
[ ] refresh keeps query navigation intent but durable facts constrain editability
[ ] posted always opens Concluir/read-only
[ ] claimed 480 remains preserved when adopted becomes 482
[ ] extraction never silently writes movement quantity
[ ] keep_registered requires reason
[ ] registered_only does not manufacture a validation/evidence upgrade
[ ] frontend never writes stock ledger
[ ] each posted receipt creates exactly one ledger effect
[ ] healthy processing creates no pending item
[ ] no second shell/palette/icon family introduced
```

- [ ] **Step 5: Commit only real test/generated-contract changes**

```bash
git status --short
```

If files changed because of test hardening or regenerated types:

```bash
git add supabase/tests/database/0012_m1_receipts_deep_flow.test.sql \
  apps/web/src/lib/supabase/database.types.ts
git commit -m "test(receipts): harden deep receipt flow regression coverage"
```

If `git status --short` is empty, do not create an empty commit.

- [ ] **Step 6: Push and verify GitHub Actions for the final SHA**

Required job steps:

```text
Install dependencies from lockfile
Unit tests
Typecheck
Build
Start local Supabase
Database tests
Verify generated TypeScript database contract
```

Do not claim the increment complete until both `web` and `database` jobs conclude `success` on the final commit SHA.

---

## Self-Review Against Spec

- Spec §§2–3 principles/architecture → Global Constraints + Tasks 1–5.
- Spec §4 application components → Tasks 3–7.
- Spec §5 divergence persistence → Tasks 1, 2, 5, 7.
- Spec §6 RPC transaction → Task 2 + Task 5 adapter.
- Spec §7 document states → Tasks 4 + 7.
- Spec §8 refresh/resume → Task 1 allowed-step guard + Task 6 router query support + Task 7 reload behavior.
- Spec §9 all REC states → Task 7.
- Spec §10 errors → Task 4 rollback + Task 7 UI error states + Task 2 transaction rollback.
- Spec §11 security → Task 2 server-side permission checks + existing RLS.
- Spec §12 stock → Task 2/8; existing movement-post trigger remains sole writer.
- Spec §13 pendencies → no healthy-processing pending creation; missing document remains a movement state handled by Pendências outside this wizard.
- Spec §14 Sales reuse → upload/conference/decision services remain independent of Sales-specific fields.
- Spec §15 tests → Tasks 1–8.
- Spec §16 acceptance → Task 8 checklist + final CI.

### Self-review corrections already incorporated

1. The current router tracks only `pathname`; Task 6 now explicitly adds `search` and a deterministic path matcher instead of saying “if needed”.
2. A draft without a document can legitimately be at Conferência after `CONTINUAR SEM DOCUMENTO`; the query string preserves that navigation intent while durable `posted` state always overrides it.
3. Document row + evidence row are now created atomically by `register_receipt_evidence_document`; the frontend only owns Storage upload and compensating Storage delete when RPC registration fails.
4. `registered_only` no longer inserts an accepted validation, preventing an autodeclared receipt from becoming `VALIDATED` simply because the operator confirmed it.
5. `use_document`/`keep_registered` require a real `document_extractions` row, not merely arbitrary JSON in `evidences.extracted_fields`.
6. The async AI/OCR producer is explicitly out of scope, not an implementation placeholder: this increment fully supports `processing` and consumes extraction results when another pipeline produces them.

No additional application dependency is required.