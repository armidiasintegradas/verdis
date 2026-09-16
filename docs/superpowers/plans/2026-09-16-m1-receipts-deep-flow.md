# VERDIS M1 Receipts Deep Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo persistente de Recebimentos do M1, de rascunho até confirmação, com documento/evidência, divergência, decisão humana, retomada após refresh e efeito de estoque somente em `draft → posted`.

**Architecture:** O frontend mantém apenas estados transitórios do wizard e persiste fatos duráveis em Supabase. `movements` é a fonte operacional da quantidade adotada, `documents` preserva o original, `document_extractions` guarda leitura append-only, `evidences` liga declarado e extraído, `validations` registra decisão humana e o RPC `confirm_receipt_m1` efetiva atomicamente o recebimento. O trigger existente de `movements` continua sendo a única origem do lançamento em `stock_ledger_entries`.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Supabase JS 2.57, PostgreSQL/Supabase, TanStack React Query 5, Zod 4, Vitest 3, Testing Library, pgTAP/Supabase DB tests, pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-16-m1-receipts-deep-flow-design.md`

## Global Constraints

- Preservar o `VERDIS UI SYSTEM V1.1`; não criar shell, paleta, família de componentes ou vocabulário paralelo.
- O recebimento nasce como `movement_type = 'receipt'` e `status = 'draft'`.
- O arquivo original é armazenado no bucket privado `evidence-documents` e nunca é silenciosamente substituído.
- `Documento processado` e `divergência operacional` são dimensões independentes.
- Extração automática nunca sobrescreve o valor originalmente informado.
- Estados transitórios `SELECTED`, `UPLOADING` e erro momentâneo de rede permanecem na UI; o banco persiste somente fatos duráveis.
- Divergência exige decisão humana explícita; manter o valor registrado no cenário homologado exige justificativa não vazia.
- Somente `draft → posted` produz efeito de estoque; o frontend nunca insere diretamente em `stock_ledger_entries`.
- A confirmação usa exatamente o RPC `confirm_receipt_m1` e deve ser transacional/idempotente contra dupla confirmação.
- Processamento documental normal não gera pendência.
- Não adicionar nova biblioteca de roteamento; reutilizar o router interno atual baseado em History API.
- Cada tarefa segue TDD: teste falha → implementação mínima → teste passa → suíte relevante → commit.

---

## File Map

### Banco

- Create: `supabase/migrations/0011_m1_receipts_deep_flow.sql` — RPC de confirmação e funções auxiliares estritamente necessárias.
- Create: `supabase/tests/database/0012_m1_receipts_deep_flow.test.sql` — pgTAP para atomicidade, decisão, justificativa, estoque e dupla confirmação.
- Modify/generated: `apps/web/src/lib/supabase/database.types.ts` — regenerado após migration; nunca editar manualmente.

### Domínio e serviços

- Create: `apps/web/src/domain/receipt-flow.ts` — tipos/validators puros, cálculo de divergência e derivação do passo retomável.
- Test: `apps/web/src/domain/receipt-flow.test.ts`.
- Modify: `apps/web/src/services/movements/create-movement.ts` — manter criação genérica; não embutir UI.
- Create: `apps/web/src/services/receipts/receipt-draft-service.ts` — create/update/load do draft de recebimento.
- Test: `apps/web/src/services/receipts/receipt-draft-service.test.ts`.
- Create: `apps/web/src/services/documents/upload-evidence-document.ts` — hash, storage, `documents` e `evidences`.
- Test: `apps/web/src/services/documents/upload-evidence-document.test.ts`.
- Create: `apps/web/src/services/receipts/receipt-conference-service.ts` — view model `processing | match | divergence`.
- Test: `apps/web/src/services/receipts/receipt-conference-service.test.ts`.
- Create: `apps/web/src/services/receipts/confirm-receipt-service.ts` — adapter TypeScript do RPC `confirm_receipt_m1`.
- Test: `apps/web/src/services/receipts/confirm-receipt-service.test.ts`.

### UI

- Create: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.tsx` — orquestrador do wizard.
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-flow.css` — estilos específicos sem redefinir tokens globais.
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-stepper.tsx` — stepper reutilizável no fluxo.
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-data-step.tsx`.
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-evidence-step.tsx`.
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-conference-step.tsx`.
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-complete-step.tsx`.
- Test: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.test.tsx`.
- Modify: `apps/web/src/app/routes.tsx` — rotas `/recebimentos/novo/:movementId` e início de novo draft.
- Modify: `apps/web/src/features/receipts/receipts-page.tsx` — CTA `+ RECEBER MATERIAL` entra no fluxo real.

---

### Task 1: Formalizar o domínio puro do fluxo de Recebimentos

**Files:**
- Create: `apps/web/src/domain/receipt-flow.ts`
- Test: `apps/web/src/domain/receipt-flow.test.ts`

**Interfaces:**
- Produces:
  - `type ReceiptDecision = 'registered_only' | 'use_document' | 'keep_registered'`
  - `type ReceiptConferenceState = 'processing' | 'match' | 'divergence'`
  - `type ReceiptResumeStep = 'dados' | 'comprovacao' | 'conferencia' | 'concluir'`
  - `calculateQuantityDifference(registeredKg: number, documentKg: number): { absoluteKg: number; percent: number }`
  - `deriveConferenceState(input): ReceiptConferenceState`
  - `requiresReceiptJustification(decision, hasDivergence): boolean`
  - `deriveReceiptResumeStep(facts): ReceiptResumeStep`

- [ ] **Step 1: Write the failing domain tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  calculateQuantityDifference,
  deriveConferenceState,
  deriveReceiptResumeStep,
  requiresReceiptJustification,
} from './receipt-flow'

describe('receipt flow domain', () => {
  it('calculates the homologated 480kg x 482kg divergence', () => {
    expect(calculateQuantityDifference(480, 482)).toEqual({
      absoluteKg: 2,
      percent: 0.4166666666666667,
    })
  })

  it('does not invent extracted data while processing', () => {
    expect(deriveConferenceState({ extractionFinished: false, registeredKg: 480, documentKg: null }))
      .toBe('processing')
  })

  it('derives divergence only when processed values differ', () => {
    expect(deriveConferenceState({ extractionFinished: true, registeredKg: 480, documentKg: 482 }))
      .toBe('divergence')
  })

  it('requires justification only when keeping the registered value in divergence', () => {
    expect(requiresReceiptJustification('keep_registered', true)).toBe(true)
    expect(requiresReceiptJustification('use_document', true)).toBe(false)
    expect(requiresReceiptJustification('registered_only', false)).toBe(false)
  })

  it('prioritizes posted over every editable state during resume', () => {
    expect(deriveReceiptResumeStep({
      movementStatus: 'posted',
      hasDocument: true,
      extractionFinished: true,
      hasDivergence: true,
      decision: null,
      justificationRequired: false,
      justificationPresent: false,
    })).toBe('concluir')
  })

  it('resumes unresolved divergence at conference', () => {
    expect(deriveReceiptResumeStep({
      movementStatus: 'draft',
      hasDocument: true,
      extractionFinished: true,
      hasDivergence: true,
      decision: null,
      justificationRequired: false,
      justificationPresent: false,
    })).toBe('conferencia')
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @verdis/web test -- src/domain/receipt-flow.test.ts
```

Expected: FAIL because `receipt-flow.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure domain module**

```ts
export type ReceiptDecision = 'registered_only' | 'use_document' | 'keep_registered'
export type ReceiptConferenceState = 'processing' | 'match' | 'divergence'
export type ReceiptResumeStep = 'dados' | 'comprovacao' | 'conferencia' | 'concluir'

export function calculateQuantityDifference(registeredKg: number, documentKg: number) {
  const absoluteKg = documentKg - registeredKg
  const percent = registeredKg === 0 ? 0 : (absoluteKg / registeredKg) * 100
  return { absoluteKg, percent }
}

export function deriveConferenceState(input: {
  extractionFinished: boolean
  registeredKg: number
  documentKg: number | null
}): ReceiptConferenceState {
  if (!input.extractionFinished || input.documentKg === null) return 'processing'
  return input.documentKg === input.registeredKg ? 'match' : 'divergence'
}

export function requiresReceiptJustification(
  decision: ReceiptDecision,
  hasDivergence: boolean,
) {
  return hasDivergence && decision === 'keep_registered'
}

export function deriveReceiptResumeStep(input: {
  movementStatus: 'draft' | 'posted' | 'voided'
  hasDocument: boolean
  extractionFinished: boolean
  hasDivergence: boolean
  decision: ReceiptDecision | null
  justificationRequired: boolean
  justificationPresent: boolean
}): ReceiptResumeStep {
  if (input.movementStatus === 'posted') return 'concluir'
  if (input.movementStatus === 'voided') return 'concluir'
  if (input.extractionFinished && input.hasDivergence && !input.decision) return 'conferencia'
  if (input.decision === 'keep_registered' && input.justificationRequired && !input.justificationPresent) return 'conferencia'
  if (input.hasDocument) return input.extractionFinished ? 'conferencia' : 'comprovacao'
  return 'dados'
}
```

- [ ] **Step 4: Run domain tests GREEN**

```bash
pnpm --filter @verdis/web test -- src/domain/receipt-flow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck and commit**

```bash
pnpm --filter @verdis/web typecheck
git add apps/web/src/domain/receipt-flow.ts apps/web/src/domain/receipt-flow.test.ts
git commit -m "feat(receipts): add receipt flow domain rules"
```

---

### Task 2: Criar o RPC transacional `confirm_receipt_m1`

**Files:**
- Create: `supabase/migrations/0011_m1_receipts_deep_flow.sql`
- Create: `supabase/tests/database/0012_m1_receipts_deep_flow.test.sql`
- Generated: `apps/web/src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces SQL function:

```sql
public.confirm_receipt_m1(
  p_movement_id uuid,
  p_decision text,
  p_evidence_id uuid default null,
  p_reason text default null
) returns table (
  movement_id uuid,
  adopted_quantity_kg numeric,
  previous_stock_kg numeric,
  new_stock_kg numeric
)
```

Allowed decisions: `registered_only`, `use_document`, `keep_registered`.

- [ ] **Step 1: Write failing pgTAP coverage first**

Create tests that seed one tenant/org/unit/material/user with permissions, create a `receipt` draft at `480`, and assert:

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

select lives_ok(
  $$ select * from public.confirm_receipt_m1(
    :'receipt_id'::uuid,
    'keep_registered',
    :'evidence_id'::uuid,
    'Quantidade operacional confirmada pela equipe.'
  ) $$,
  'valid keep_registered confirms receipt'
);

select is(
  (select status::text from public.movements where id = :'receipt_id'::uuid),
  'posted',
  'receipt is posted'
);

select is(
  (select count(*)::int from public.stock_ledger_entries where movement_id = :'receipt_id'::uuid),
  1,
  'posting creates exactly one stock ledger row'
);
```

Add independent fixture for `use_document` with `claimed_fields.quantity_kg = 480`, `extracted_fields.quantity_kg = 482` and assert movement becomes `482` before posting while original claim remains `480`.

Add second-call test asserting already-posted receipt is rejected and ledger count remains `1`.

- [ ] **Step 2: Run DB tests and verify RED**

```bash
supabase start
supabase test db
```

Expected: the new test fails because `confirm_receipt_m1` does not exist.

- [ ] **Step 3: Implement migration with permission, scope and atomicity checks**

The function must be `security definer`, set a safe search path, explicitly inspect `auth.uid()`, and rely on existing permission function:

```sql
create or replace function public.confirm_receipt_m1(
  p_movement_id uuid,
  p_decision text,
  p_evidence_id uuid default null,
  p_reason text default null
)
returns table (
  movement_id uuid,
  adopted_quantity_kg numeric,
  previous_stock_kg numeric,
  new_stock_kg numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.movements;
  v_evidence public.evidences;
  v_document_quantity numeric;
  v_previous_stock numeric;
begin
  if v_user_id is null then
    raise exception 'authenticated user is required';
  end if;

  select * into v_movement
  from public.movements
  where id = p_movement_id
  for update;

  if v_movement.id is null then raise exception 'receipt not found'; end if;
  if v_movement.movement_type <> 'receipt' then raise exception 'movement is not a receipt'; end if;
  if v_movement.status <> 'draft' then raise exception 'receipt is not draft'; end if;

  if not app_private.has_permission(
    v_user_id,
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    'movement.create'
  ) then
    raise exception 'receipt confirmation is not authorized';
  end if;

  if p_decision not in ('registered_only','use_document','keep_registered') then
    raise exception 'invalid receipt decision';
  end if;

  if p_decision in ('use_document','keep_registered') then
    if p_evidence_id is null then raise exception 'evidence is required'; end if;

    select * into v_evidence
    from public.evidences
    where id = p_evidence_id and movement_id = p_movement_id
    for share;

    if v_evidence.id is null then raise exception 'receipt evidence not found'; end if;

    v_document_quantity := nullif(v_evidence.extracted_fields->>'quantity_kg','')::numeric;
    if v_document_quantity is null or v_document_quantity <= 0 then
      raise exception 'processed document quantity is required';
    end if;
  end if;

  if p_decision = 'keep_registered'
     and v_document_quantity is distinct from v_movement.quantity_kg
     and nullif(btrim(coalesce(p_reason,'')), '') is null then
    raise exception 'receipt justification is required';
  end if;

  v_previous_stock := app_private.current_stock_quantity(
    v_movement.tenant_id,
    v_movement.organization_id,
    v_movement.unit_id,
    v_movement.material_id
  );

  if p_decision = 'use_document' then
    update public.movements
    set quantity_kg = v_document_quantity
    where id = p_movement_id;
  end if;

  insert into public.validations (
    movement_id,
    evidence_id,
    validation_type,
    status,
    automated,
    actor_user_id,
    rule_code,
    reason
  ) values (
    p_movement_id,
    p_evidence_id,
    'operator_resolution',
    'accepted',
    false,
    v_user_id,
    case p_decision
      when 'use_document' then 'RECEIPT_USE_DOCUMENT_QUANTITY'
      when 'keep_registered' then 'RECEIPT_KEEP_REGISTERED_QUANTITY'
      else 'RECEIPT_REGISTERED_ONLY'
    end,
    nullif(btrim(coalesce(p_reason,'')), '')
  );

  update public.movements
  set status = 'posted'
  where id = p_movement_id;

  return query
  select
    m.id,
    m.quantity_kg,
    v_previous_stock,
    app_private.current_stock_quantity(m.tenant_id,m.organization_id,m.unit_id,m.material_id)
  from public.movements m where m.id = p_movement_id;
end;
$$;

revoke all on function public.confirm_receipt_m1(uuid,text,uuid,text) from public, anon;
grant execute on function public.confirm_receipt_m1(uuid,text,uuid,text) to authenticated;
```

Before accepting this implementation, verify the test fixture gives `movement.create` to the actor and that the existing triggers permit the draft quantity update before posting.

- [ ] **Step 4: Run DB tests GREEN**

```bash
supabase test db
```

Expected: all database tests pass, including `0012_m1_receipts_deep_flow.test.sql`.

- [ ] **Step 5: Regenerate TypeScript DB types**

Use the repository's existing generation command used by CI. If the repo script is direct Supabase CLI, run:

```bash
supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts
```

Then verify:

```bash
git diff -- apps/web/src/lib/supabase/database.types.ts
```

Expected: `confirm_receipt_m1` appears under Functions with the exact arguments/return fields defined above.

- [ ] **Step 6: Run web typecheck and commit**

```bash
pnpm --filter @verdis/web typecheck
git add supabase/migrations/0011_m1_receipts_deep_flow.sql \
  supabase/tests/database/0012_m1_receipts_deep_flow.test.sql \
  apps/web/src/lib/supabase/database.types.ts
git commit -m "feat(receipts): add atomic receipt confirmation rpc"
```

---

### Task 3: Implementar persistência do rascunho de Recebimento

**Files:**
- Create: `apps/web/src/services/receipts/receipt-draft-service.ts`
- Test: `apps/web/src/services/receipts/receipt-draft-service.test.ts`
- Reuse: `apps/web/src/services/movements/create-movement.ts`

**Interfaces:**

```ts
export type ReceiptDraftInput = {
  materialId: string
  quantityKg: number
  occurredAt: string
  sourceCounterpartyId: string | null
}

export async function createReceiptDraft(scope: ActiveScope, input: ReceiptDraftInput): Promise<{ id: string }>
export async function updateReceiptDraft(movementId: string, scope: ActiveScope, input: ReceiptDraftInput): Promise<void>
export async function getReceiptDraft(movementId: string, scope: ActiveScope): Promise<ReceiptDraftRecord>
```

- [ ] **Step 1: Write failing service tests with mocked Supabase**

Assert create maps to generic `createMovement` with `movementType: 'receipt'`; update refuses to target non-draft/non-receipt rows; load filters by active tenant/org/unit scope.

Representative assertion:

```ts
expect(createMovement).toHaveBeenCalledWith(scope, {
  movementType: 'receipt',
  materialId: input.materialId,
  quantityKg: input.quantityKg,
  occurredAt: input.occurredAt,
  sourceCounterpartyId: input.sourceCounterpartyId,
})
```

- [ ] **Step 2: Run RED**

```bash
pnpm --filter @verdis/web test -- src/services/receipts/receipt-draft-service.test.ts
```

- [ ] **Step 3: Implement minimal service**

Create uses existing `createMovement`; update performs scoped `.update(...)` with `.eq('id', movementId).eq('movement_type','receipt').eq('status','draft')`; load selects only fields required by the wizard and throws a domain-safe error when absent.

Do not add step state columns to `movements`.

- [ ] **Step 4: Run GREEN + typecheck**

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

### Task 4: Implementar upload e vínculo de evidência sem perder o draft

**Files:**
- Create: `apps/web/src/services/documents/upload-evidence-document.ts`
- Test: `apps/web/src/services/documents/upload-evidence-document.test.ts`
- Reuse: `apps/web/src/services/documents/hash-file.ts`

**Interfaces:**

```ts
export type UploadReceiptEvidenceInput = {
  scope: ActiveScope
  movementId: string
  file: File
  claimedQuantityKg: number
}

export async function uploadReceiptEvidence(input: UploadReceiptEvidenceInput): Promise<{
  documentId: string
  evidenceId: string
  originalFilename: string
}>
```

- [ ] **Step 1: Write failing tests**

Cover:

1. SHA-256 is calculated before upload.
2. storage path is scoped as `${tenantId}/${organizationId}/${movementId}/${crypto.randomUUID()}-${safeFilename}`.
3. storage upload success creates `documents`, then `evidences` with `claimed_fields: { quantity_kg }` and empty `extracted_fields`.
4. storage failure throws without mutating the movement.
5. if DB insert after storage fails, best-effort delete removes the just-uploaded object to avoid orphaned object; movement still remains untouched.

- [ ] **Step 2: Run RED**

```bash
pnpm --filter @verdis/web test -- src/services/documents/upload-evidence-document.test.ts
```

- [ ] **Step 3: Implement upload service**

Core sequence:

```ts
const sha256 = await hashFile(file)
const path = buildEvidenceStoragePath(...)
const { error: uploadError } = await supabase.storage.from('evidence-documents').upload(path, file, {
  contentType: file.type || 'application/octet-stream',
  upsert: false,
})
if (uploadError) throw uploadError

try {
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .insert({
      tenant_id: scope.tenantId,
      organization_id: scope.organizationId,
      uploaded_by: user.id,
      document_type: 'receipt_evidence',
      original_filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      sha256,
      storage_bucket: 'evidence-documents',
      storage_path: path,
      extraction_status: 'pending',
    })
    .select('id')
    .single()

  // then insert evidence with movement_id + claimed_fields
} catch (error) {
  await supabase.storage.from('evidence-documents').remove([path])
  throw error
}
```

Do not update `movements.quantity_kg` here.

- [ ] **Step 4: Run GREEN + typecheck**

```bash
pnpm --filter @verdis/web test -- src/services/documents/upload-evidence-document.test.ts
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/documents/upload-evidence-document.ts \
  apps/web/src/services/documents/upload-evidence-document.test.ts
git commit -m "feat(receipts): upload and link receipt evidence"
```

---

### Task 5: Montar o view model de Conferência e o adapter de confirmação

**Files:**
- Create: `apps/web/src/services/receipts/receipt-conference-service.ts`
- Test: `apps/web/src/services/receipts/receipt-conference-service.test.ts`
- Create: `apps/web/src/services/receipts/confirm-receipt-service.ts`
- Test: `apps/web/src/services/receipts/confirm-receipt-service.test.ts`

**Interfaces:**

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

export async function loadReceiptConference(movementId: string, scope: ActiveScope): Promise<ReceiptConferenceViewModel>

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

- [ ] **Step 1: Write conference tests**

Cover:

- document exists with `extraction_status = pending` and no extraction → `processing`, `documentQuantityKg = null`;
- extraction/evidence contains `480` → `match`;
- extraction/evidence contains `482` against registered `480` → `divergence`, `2`, `0.4166…`;
- service never falls back to invented values from fixtures.

- [ ] **Step 2: Write confirm adapter tests**

Assert exact RPC invocation:

```ts
expect(supabase.rpc).toHaveBeenCalledWith('confirm_receipt_m1', {
  p_movement_id: movementId,
  p_decision: 'keep_registered',
  p_evidence_id: evidenceId,
  p_reason: 'Quantidade operacional confirmada.',
})
```

Map nullable/numeric RPC output to TypeScript numbers and surface errors without extra stock writes.

- [ ] **Step 3: Run RED**

```bash
pnpm --filter @verdis/web test -- \
  src/services/receipts/receipt-conference-service.test.ts \
  src/services/receipts/confirm-receipt-service.test.ts
```

- [ ] **Step 4: Implement both services using domain helpers from Task 1**

`receipt-conference-service.ts` must read scoped `movements`, linked `evidences`, `documents`, and latest extraction/evidence data. Prefer already-materialized `evidences.extracted_fields`; when empty and document is still pending, return `processing`.

`confirm-receipt-service.ts` must only call the RPC; no `.update('movements')` and no stock mutation in TypeScript.

- [ ] **Step 5: Run GREEN + typecheck**

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

### Task 6: Implementar o wizard profundo de Recebimentos no VERDIS UI SYSTEM V1.1

**Files:**
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-stepper.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-data-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-evidence-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-conference-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-complete-step.tsx`
- Create: `apps/web/src/features/receipts/receipt-flow/receipt-flow.css`
- Test: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.test.tsx`

**Interfaces:**

`ReceiptFlowPage` receives/derives `movementId` from route params and controls the URL `?step=dados|comprovacao|conferencia|concluir`.

Local-only upload state:

```ts
type UploadUiState =
  | { kind: 'none' }
  | { kind: 'selected'; file: File }
  | { kind: 'uploading'; file: File; progress: number | null }
  | { kind: 'failed'; file: File; message: string }
```

Durable document/process state always comes from services/query cache.

- [ ] **Step 1: Write the flow tests before components**

Minimum component scenarios:

```ts
it('keeps CONTINUAR disabled after selecting a file until the upload succeeds')
it('shows Falha no envio without losing the draft values')
it('shows only registered data while document processing')
it('does not preselect a divergence decision')
it('requires justification when keeping 480kg against 482kg')
it('confirms 482kg without justification when use_document is chosen')
it('renders completion with previous + entry = new stock')
it('restores the deterministic step after remount/refresh')
```

Mock services, not Supabase internals, in page tests.

- [ ] **Step 2: Run RED**

```bash
pnpm --filter @verdis/web test -- src/features/receipts/receipt-flow/receipt-flow-page.test.tsx
```

- [ ] **Step 3: Implement shared stepper and page shell first**

Stepper labels exactly:

```text
1 Dados
2 Comprovação
3 Conferência
4 Concluir
```

Use existing `Breadcrumb`, `PageHeader`, `Button`, `StatusBadge`, cards and tokens; do not define a second design system.

- [ ] **Step 4: Implement Dados**

Fields:

- Origem
- Material
- Peso/quantidade
- Data e hora

On first advance, call `createReceiptDraft`; after an existing movement, call `updateReceiptDraft`. Route becomes `/recebimentos/novo/<id>?step=comprovacao`.

- [ ] **Step 5: Implement Comprovação states**

UI states and actions exactly:

- `none`: `TIRAR FOTO`, `ENVIAR ARQUIVO`, `CONTINUAR SEM DOCUMENTO`;
- `selected`: filename/size/type, `Pronto para enviar`, `ENVIAR DOCUMENTO`, normal `CONTINUAR` disabled;
- `uploading`: progress when available, conflicting actions disabled;
- durable upload success: `Documento enviado` + `Processando`, `VISUALIZAR DOCUMENTO`, `CONTINUAR` enabled;
- `failed`: `Falha no envio`, `TENTAR NOVAMENTE`, trocar arquivo, tirar outra foto, `CONTINUAR SEM DOCUMENTO`.

Do not show storage/API errors verbatim.

- [ ] **Step 6: Implement Conferência**

For `processing`: show only registered data + processing status + confirmation path `registered_only`.

For `divergence` 480/482:

```text
Informado: 480 kg
Documento: 482 kg
Diferença: +2 kg / +0,42%
[ USAR 482 KG ] [ MANTER 480 KG ]
```

No initial selection. If `keep_registered`, show required textarea and keep `CONFIRMAR RECEBIMENTO` disabled until `trim().length > 0`.

- [ ] **Step 7: Implement Concluir**

Render RPC result:

- quantity adopted;
- registered/document values when applicable;
- decision/reason;
- previous stock;
- confirmed entry;
- new stock;
- linked document status;
- `VER MOVIMENTAÇÃO`;
- `RECEBER OUTRO MATERIAL`.

- [ ] **Step 8: Run GREEN and visual-contract tests**

```bash
pnpm --filter @verdis/web test -- src/features/receipts/receipt-flow/receipt-flow-page.test.tsx
pnpm --filter @verdis/web typecheck
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/receipts/receipt-flow
git commit -m "feat(receipts): implement persistent receipt wizard"
```

---

### Task 7: Ligar rotas, CTA e retomada após refresh

**Files:**
- Modify: `apps/web/src/app/routes.tsx`
- Modify: `apps/web/src/app/router.tsx` only if param parsing is not already supported
- Modify: `apps/web/src/features/receipts/receipts-page.tsx`
- Modify/Test: `apps/web/src/app/m1-navigation.test.tsx`
- Test: `apps/web/src/features/receipts/receipt-flow/receipt-flow-page.test.tsx`

**Interfaces:**

Required routes:

```text
/recebimentos
/recebimentos/novo/:movementId?step=dados
/recebimentos/novo/:movementId?step=comprovacao
/recebimentos/novo/:movementId?step=conferencia
/recebimentos/novo/:movementId?step=concluir
```

For a brand-new operation, the CTA may enter a small creation state and replace the URL once `movementId` exists; do not fabricate a UUID before the DB creates the draft.

- [ ] **Step 1: Write route/navigation tests**

Assert:

- clicking `+ RECEBER MATERIAL` starts the new-receipt flow;
- a URL containing real `movementId` renders `ReceiptFlowPage`;
- query step does not allow editing a `posted` movement;
- reload/remount calls `deriveReceiptResumeStep` from durable facts and canonicalizes the URL to the allowed step.

- [ ] **Step 2: Run RED**

```bash
pnpm --filter @verdis/web test -- src/app/m1-navigation.test.tsx src/features/receipts/receipt-flow/receipt-flow-page.test.tsx
```

- [ ] **Step 3: Implement the route integration**

Extend the existing internal router minimally to support one `:movementId` segment if needed. Do not import or add React Router.

- [ ] **Step 4: Run GREEN + whole web suite**

```bash
pnpm --filter @verdis/web test
pnpm --filter @verdis/web typecheck
pnpm --filter @verdis/web build
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes.tsx apps/web/src/app/router.tsx \
  apps/web/src/app/m1-navigation.test.tsx \
  apps/web/src/features/receipts/receipts-page.tsx \
  apps/web/src/features/receipts/receipt-flow/receipt-flow-page.test.tsx
git commit -m "feat(receipts): route and resume receipt drafts"
```

---

### Task 8: End-to-end database regression and final gates

**Files:**
- Modify: `supabase/tests/database/0012_m1_receipts_deep_flow.test.sql` if coverage gaps remain
- Optional modify only if required by generated contract: `apps/web/src/lib/supabase/database.types.ts`
- Update: PR description / implementation notes, not product code.

**Interfaces:** None new; this task verifies the vertical slice as one system.

- [ ] **Step 1: Add final regression assertions to pgTAP**

Ensure the DB test proves all four durable receipt paths:

```text
A. 480kg + no evidence + registered_only → posted + ledger +480
B. 480kg + evidence 482 + use_document → posted quantity 482 + ledger +482
C. 480kg + evidence 482 + keep_registered + reason → posted quantity 480 + ledger +480
D. retry confirm on any posted receipt → reject + no second ledger row
```

Also assert `validations.rule_code` and `reason` for B/C.

- [ ] **Step 2: Run fresh full database verification**

```bash
supabase start
supabase test db
```

Expected: all database tests pass.

- [ ] **Step 3: Verify generated TypeScript contract is clean**

```bash
supabase gen types typescript --local > /tmp/verdis-database.types.ts
diff -u apps/web/src/lib/supabase/database.types.ts /tmp/verdis-database.types.ts
```

Expected: no diff.

- [ ] **Step 4: Run fresh full web verification**

```bash
pnpm --filter @verdis/web test
pnpm --filter @verdis/web typecheck
pnpm --filter @verdis/web build
```

Expected: 0 failed tests, typecheck exit 0, build exit 0.

- [ ] **Step 5: Inspect diff against the approved spec**

Checklist:

```text
[ ] REC-03A Dados exists
[ ] REC-03B empty evidence exists
[ ] REC-03C selected exists
[ ] REC-03D uploading exists
[ ] REC-03E uploaded/processing exists
[ ] REC-03F upload failed exists
[ ] REC-04A conference/processing exists
[ ] REC-04B 480/482 divergence exists
[ ] REC-04C justification exists
[ ] REC-05 completion exists
[ ] refresh resumes from durable facts
[ ] original claimed quantity is preserved
[ ] extraction does not silently overwrite movement
[ ] decision is explicit
[ ] posted is the only stock-effect boundary
[ ] stock ledger is never written by frontend
[ ] normal processing does not create pending item
[ ] no new shell/design language was introduced
```

- [ ] **Step 6: Commit any final test-only adjustments**

```bash
git add supabase/tests/database/0012_m1_receipts_deep_flow.test.sql \
  apps/web/src/lib/supabase/database.types.ts
git commit -m "test(receipts): complete M1 receipt flow regression coverage"
```

Do not create an empty commit if no files changed.

- [ ] **Step 7: Push branch and let GitHub Actions be the final independent gate**

Expected CI gates:

```text
Install dependencies from lockfile
Unit tests
Typecheck
Build
Start local Supabase
Database tests
Verify generated TypeScript database contract
```

Do not claim completion until the workflow for the final commit reports `success` for both `web` and `database` jobs.

---

## Self-Review Against Spec

Coverage mapping:

- Spec §§2–3 principles/architecture → Global Constraints + Tasks 1–5.
- Spec §4 application components → Tasks 3–6.
- Spec §5 divergence persistence → Tasks 1, 2, 5, 6.
- Spec §6 `confirm_receipt_m1` → Task 2 + Task 5 adapter.
- Spec §7 document states → Tasks 4 + 6.
- Spec §8 deterministic resume → Tasks 1 + 7.
- Spec §9 all REC states → Task 6.
- Spec §10 error handling → Tasks 4 + 6 + DB rollback assertions in Task 8.
- Spec §11 authorization → Task 2 DB checks + existing RLS reuse.
- Spec §12 stock → Task 2/8, using existing trigger only.
- Spec §13 pendencies → Task 6 behavior; no pending record for healthy processing.
- Spec §14 future Sales reuse → isolated domain/upload/conference services; no Sales-specific fields added.
- Spec §15 tests → Tasks 1–8.
- Spec §16 acceptance → Task 8 checklist + CI gate.

No new application dependency is required. No placeholder implementation step is intentionally left open; executor must stop if repository reality contradicts a named interface rather than silently inventing a second architecture.
