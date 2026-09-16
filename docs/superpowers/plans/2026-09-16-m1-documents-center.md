# VERDIS M1 Documents Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/documentos` demo-data screen with a persistent, scoped, read-only Documents Center that reconstructs receipt/sale evidence, extraction state, comparison, human resolution and secure original-file access from durable Supabase records.

**Architecture:** Keep Documents as a read model over the existing Evidence Engine. Add focused query/detail/file-access services that compose `documents`, `evidences`, `document_extractions`, `movements`, `materials`, `sales` and existing persisted human-resolution data under the active scope; then replace the demo list and add `/documentos/:documentId` without introducing a new upload path or source of truth. Prefer existing tables and RLS; add no migration unless current schema/policies prove insufficient during implementation.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Supabase JS 2, existing History API router, Vitest 3, Testing Library, pnpm workspace, Supabase/Postgres/RLS/Storage, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-16-m1-documents-center-design.md`

## Global Constraints

- Preserve VERDIS UI SYSTEM V1.1 and the existing shell, palette, spacing, typography, buttons, badges and filters.
- `/documentos` is read-only in M1; no direct document upload, delete, extraction edit, movement edit or approval action.
- Only real durable documents may appear; never create synthetic `Sem documento` rows.
- Healthy extraction processing is not pending and must not increment `Requer revisão`.
- Extraction state, comparison state and human resolution remain separate concepts.
- Never label a processed document as `validado`, `auditado`, `certificado` or `conforme` merely because extraction completed.
- All reads must be constrained by the active tenant/organization/unit scope and existing RLS; never expose service-role credentials in the frontend.
- Prefer existing tables/policies. No migration merely to simplify frontend joins.
- Original-file viewing must respect authenticated/private Storage access; do not assume a public bucket or persist unauthenticated permanent URLs.
- Receipt movement navigation: `/recebimentos/novo/:movementId?step=concluir`.
- Sale movement navigation: `/vendas/nova/:movementId?step=concluir`.
- No external routing dependency; keep the accepted History API router.
- No realtime subscription, speculative cache layer, search engine, background indexing or pagination infrastructure for M1.
- Keep Receipt and Sale regressions green throughout.

---

## File Structure

**Create**
- `apps/web/src/domain/document-center.ts` — pure derivation helpers and view-model state types for origin, extraction/review status and comparisons.
- `apps/web/src/domain/document-center.test.ts` — unit tests for pure state/comparison derivation.
- `apps/web/src/services/documents/documents-query-service.ts` — scoped durable list composition.
- `apps/web/src/services/documents/documents-query-service.test.ts` — service query/mapping tests.
- `apps/web/src/services/documents/document-detail-service.ts` — scoped detail reconstruction from durable evidence/extraction/resolution facts.
- `apps/web/src/services/documents/document-detail-service.test.ts` — detail reconstruction tests.
- `apps/web/src/services/documents/open-document-file.ts` — authenticated Storage signed-URL/open helper using the existing `evidence-documents` bucket.
- `apps/web/src/services/documents/open-document-file.test.ts` — signed URL and failure behavior tests.
- `apps/web/src/features/documents/document-detail-page.tsx` — read-only detail route.
- `apps/web/src/features/documents/document-detail-page.test.tsx` — detail UI/refresh/navigation/file-error tests.

**Modify**
- `apps/web/src/features/documents/documents-page.tsx` — remove `demo-data`, load durable list, metrics, filters, empty/error states and navigation.
- `apps/web/src/features/documents/documents-page.test.tsx` — persistent list/filter/navigation tests; create if current test does not exist.
- `apps/web/src/app/routes.tsx` — deterministic `/documentos/:documentId` matcher and detail route.
- `apps/web/src/app/m1-navigation.test.tsx` — list/detail route and back/forward/direct refresh coverage.
- `apps/web/src/lib/supabase/database.types.ts` — only if generated contract changes because a minimal migration becomes necessary.
- `supabase/migrations/0013_m1_documents_center*.sql` — only if schema/policy inspection proves a minimal migration is necessary.
- `supabase/tests/*documents*.sql` — only if a migration/RPC/policy is added.
- PR #4 body — update final implementation/verification evidence after full CI succeeds.

---

### Task 1: Lock the Documents Center domain semantics

**Files:**
- Create: `apps/web/src/domain/document-center.ts`
- Test: `apps/web/src/domain/document-center.test.ts`

**Interfaces:**
- Consumes: existing receipt/sale evidence semantics and JSON field conventions (`quantity_kg`, `unit_price`, `total_amount`).
- Produces:
  - `DocumentOrigin = 'receipt' | 'sale'`
  - `DocumentExtractionState = 'processing' | 'processed' | 'failed'`
  - `DocumentReviewState = 'none' | 'required' | 'resolved'`
  - `deriveDocumentPresentationState(...)`
  - `deriveReceiptDocumentComparison(...)`
  - `deriveSaleDocumentComparison(...)`

- [ ] **Step 1: Write failing pure-domain tests**

Add tests that prove:

```ts
expect(deriveDocumentPresentationState({
  extractionExists: false,
  extractionStatus: 'pending',
  hasActionableDivergence: false,
  hasHumanResolution: false,
})).toEqual({ extractionState: 'processing', reviewState: 'none' })

expect(deriveDocumentPresentationState({
  extractionExists: true,
  extractionStatus: 'accepted',
  hasActionableDivergence: true,
  hasHumanResolution: false,
})).toEqual({ extractionState: 'processed', reviewState: 'required' })

expect(deriveDocumentPresentationState({
  extractionExists: true,
  extractionStatus: 'accepted',
  hasActionableDivergence: true,
  hasHumanResolution: true,
})).toEqual({ extractionState: 'processed', reviewState: 'resolved' })
```

Also assert canonical comparisons:

```ts
expect(deriveReceiptDocumentComparison(480, 482)).toEqual({
  registeredQuantityKg: 480,
  documentQuantityKg: 482,
  differenceKg: 2,
  differencePercent: expect.closeTo(0.416666, 5),
  hasDivergence: true,
})

expect(deriveSaleDocumentComparison(
  { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
  { quantityKg: 1000, unitPrice: 3.2, totalAmount: 3200 },
)).toMatchObject({
  unitPriceDifference: 0.1,
  totalDifference: 100,
  percent: expect.closeTo(3.225806, 5),
  hasDivergence: true,
})
```

- [ ] **Step 2: Run domain tests and verify RED**

Run:

```bash
pnpm --filter @verdis/web test -- src/domain/document-center.test.ts
```

Expected: FAIL because `document-center.ts` and exported helpers do not exist.

- [ ] **Step 3: Implement minimal pure derivation layer**

Implement defensive numeric parsing/comparison helpers with no Supabase dependency. `failed` must be derived only from a durable failure/rejected extraction condition; no-extraction/pending remains `processing`. `reviewState='required'` only when a usable extraction has actionable divergence and no persisted resolution.

- [ ] **Step 4: Re-run domain tests and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/domain/document-center.ts apps/web/src/domain/document-center.test.ts
git commit -m "feat(documents): define document center states"
```

---

### Task 2: Implement the scoped persistent document list service

**Files:**
- Create: `apps/web/src/services/documents/documents-query-service.ts`
- Test: `apps/web/src/services/documents/documents-query-service.test.ts`

**Interfaces:**
- Consumes: `ActiveScope`, Supabase client, Task 1 derivation helpers.
- Produces:

```ts
export type DocumentListItem = {
  documentId: string
  movementId: string
  origin: 'receipt' | 'sale'
  filename: string
  mimeType: string | null
  occurredAt: string
  materialId: string | null
  materialLabel: string | null
  extractionState: 'processing' | 'processed' | 'failed'
  reviewState: 'none' | 'required' | 'resolved'
  movementLabel: string
}

export async function loadDocuments(scope: ActiveScope): Promise<DocumentListItem[]>
```

- [ ] **Step 1: Write failing service tests with a Supabase mock chain**

Cover at least these fixtures:

1. receipt document, movement type `receipt`, extraction pending → `processing/none`;
2. sale document, processed extraction with matching fields → `processed/none`;
3. receipt 480 vs 482 with no human resolution → `processed/required`;
4. sale 3.10/3100 vs 3.20/3200 with persisted resolution → `processed/resolved`;
5. durable rejected/failure extraction → `failed/none`;
6. query contains active `tenant_id`, `organization_id` and correct `unit_id` handling;
7. only actual `documents` rows become list items.

Mock each underlying relation explicitly; do not hide scope assertions behind a generic fake.

- [ ] **Step 2: Run service test and verify RED**

```bash
pnpm --filter @verdis/web test -- src/services/documents/documents-query-service.test.ts
```

Expected: FAIL because `loadDocuments` does not exist.

- [ ] **Step 3: Implement `loadDocuments` using existing schema**

Start from scoped `movements` because organization/unit scoping is explicit there, then hydrate linked evidences/documents/extractions/materials/resolutions in deterministic bounded queries. Build a dedicated view model; do not return raw database rows to React.

Rules:
- sort newest first;
- infer origin from `movement_type` (`receipt`/`sale`) and ignore unrelated movement types for this M1 screen;
- no evidence/document means no row;
- pending/no usable extraction remains processing;
- actionable unresolved divergence alone sets review required;
- human resolution clears review required without rewriting extraction state.

Do not add a migration during this task unless the current RLS/query shape makes safe composition impossible.

- [ ] **Step 4: Run service tests and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Run Receipt/Sale service regressions**

```bash
pnpm --filter @verdis/web test -- \
  src/services/receipts/receipt-conference-service.test.ts \
  src/services/receipts/receipt-completion-service.test.ts \
  src/services/sales/sale-conference-service.test.ts \
  src/services/sales/sale-completion-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/services/documents/documents-query-service.ts apps/web/src/services/documents/documents-query-service.test.ts
git commit -m "feat(documents): load scoped persistent documents"
```

---

### Task 3: Implement durable document detail reconstruction

**Files:**
- Create: `apps/web/src/services/documents/document-detail-service.ts`
- Test: `apps/web/src/services/documents/document-detail-service.test.ts`

**Interfaces:**
- Consumes: `ActiveScope`, Task 1 comparison helpers, existing durable evidence/extraction/human-resolution data.
- Produces:

```ts
export type DocumentDetailViewModel = {
  documentId: string
  movementId: string
  origin: 'receipt' | 'sale'
  filename: string
  mimeType: string | null
  storagePath: string
  occurredAt: string
  material: { id: string; label: string | null } | null
  extractionState: 'processing' | 'processed' | 'failed'
  reviewState: 'none' | 'required' | 'resolved'
  confidence: number | null
  receiptComparison: null | {
    registeredQuantityKg: number
    documentQuantityKg: number | null
    differenceKg: number | null
    differencePercent: number | null
    hasDivergence: boolean
  }
  saleComparison: null | {
    registered: { quantityKg: number; unitPrice: number; totalAmount: number }
    documentary: { quantityKg: number | null; unitPrice: number | null; totalAmount: number | null }
    unitPriceDifference: number | null
    totalDifference: number | null
    percent: number | null
    hasDivergence: boolean
  }
  resolution: null | {
    decision: 'registered_only' | 'use_document' | 'keep_registered'
    label: string
    reason: string | null
    resolvedAt: string | null
  }
}

export async function loadDocumentDetail(
  documentId: string,
  scope: ActiveScope,
): Promise<DocumentDetailViewModel | null>
```

- [ ] **Step 1: Write failing detail tests**

Cover:
- receipt 480 vs 482 unresolved;
- receipt divergence resolved with `keep_registered` and justification;
- sale 1000 @ 3.10/3100 vs 3.20/3200 unresolved;
- sale resolved `use_document`;
- processing document with no extraction: documentary values remain `null`;
- registered-only confirmation: no fabricated extracted values or accepted validation;
- extraction confidence is surfaced only when stored;
- out-of-scope/missing document returns `null` with no second unscoped fallback query;
- optional extraction/resolution absence does not fail otherwise valid detail.

- [ ] **Step 2: Run detail tests and verify RED**

```bash
pnpm --filter @verdis/web test -- src/services/documents/document-detail-service.test.ts
```

Expected: FAIL because detail service is missing.

- [ ] **Step 3: Implement scoped reconstruction**

Load ownership through the active scoped movement/evidence relationship before exposing document metadata. Keep claimed fields and extracted fields separate. Normalize receipt and sale comparisons independently; do not create one misleading generic table. Derive neutral decision labels using the existing wording from Receipt/Sale completion flows.

If the current human-resolution table/columns differ from the proposed type, map existing durable values into the view model instead of changing schema.

- [ ] **Step 4: Re-run detail tests and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/documents/document-detail-service.ts apps/web/src/services/documents/document-detail-service.test.ts
git commit -m "feat(documents): reconstruct durable document detail"
```

---

### Task 4: Add deterministic document detail routing

**Files:**
- Modify: `apps/web/src/app/routes.tsx`
- Modify: `apps/web/src/app/m1-navigation.test.tsx`
- Create later-consumed component stub only if required by the test harness: `apps/web/src/features/documents/document-detail-page.tsx`

**Interfaces:**
- Produces:

```ts
export function matchDocumentDetailPath(pathname: string): { documentId: string } | null
```

with:
- `/documentos` → `null` detail match;
- `/documentos/<nonempty-single-segment-id>` → `{ documentId }`;
- `/documentos/a/b` → `null`;
- unknown document paths fall through without crashing.

- [ ] **Step 1: Add failing navigation tests**

Assert `matchDocumentDetailPath('/documentos/document-id')` and AppRoutes rendering for direct detail navigation. Add browser/history test proving back from detail returns to `/documentos` using the existing router behavior.

- [ ] **Step 2: Run navigation test and verify RED**

```bash
pnpm --filter @verdis/web test -- src/app/m1-navigation.test.tsx
```

Expected: FAIL because document detail matcher/route is absent.

- [ ] **Step 3: Implement the matcher and route wiring**

Use the same single-segment pattern already used for Receipt/Sale flows. Do not add a router dependency. Route detail before the `/documentos` list switch case.

- [ ] **Step 4: Re-run navigation test and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes.tsx apps/web/src/app/m1-navigation.test.tsx apps/web/src/features/documents/document-detail-page.tsx
git commit -m "feat(documents): add durable detail route"
```

---

### Task 5: Replace the demo Documents list with durable data

**Files:**
- Modify: `apps/web/src/features/documents/documents-page.tsx`
- Create/Modify: `apps/web/src/features/documents/documents-page.test.tsx`

**Interfaces:**
- Consumes: `useScope()`, `loadDocuments(scope)`, router `navigate()`.
- Produces: persistent `/documentos` list UI with metrics and filters.

- [ ] **Step 1: Write failing UI tests**

Mock `loadDocuments` with a deterministic set containing:
- one receipt processed/resolved;
- one sale processing;
- one receipt requiring review;
- one failed extraction.

Assert:
- no import/use of demo-data through behavior (metrics/rows equal mocked durable dataset);
- metrics: linked total, processed, processing, requires review;
- processing does not count as review required;
- row displays filename, origin, material and correct status copy;
- `VISUALIZAR` navigates to `/documentos/:documentId`;
- `ABRIR MOVIMENTAÇÃO` uses receipt/sale route based on origin;
- list load failure shows exactly `Não foi possível carregar os documentos deste contexto.`;
- empty durable result shows `Nenhum documento vinculado neste contexto.` and helper text;
- loading does not flash demo counts.

- [ ] **Step 2: Run page test and verify RED**

```bash
pnpm --filter @verdis/web test -- src/features/documents/documents-page.test.tsx
```

Expected: FAIL because current page still imports `documents, m1Summary` from demo-data.

- [ ] **Step 3: Implement service-backed list and durable metrics**

Remove `@/features/m1/demo-data` from `documents-page.tsx`. Load on active-scope changes with cancellation guard matching existing service-backed pages. Compute metrics from `DocumentListItem[]` after successful load.

Status copy:
- `processing` → `Processando`;
- `failed` → `Falha de processamento`;
- `reviewState='required'` → `Requer revisão`;
- otherwise processed → `Processado`.

- [ ] **Step 4: Add client-side M1 filtering**

Implement controlled filters for search, origin, state, material and period over the already scoped durable list. Search filename and movement label. `Limpar filtros` resets all controls. When durable list is nonempty but filters produce zero rows, show `Nenhum documento encontrado com os filtros atuais.`.

- [ ] **Step 5: Re-run page test and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/documents/documents-page.tsx apps/web/src/features/documents/documents-page.test.tsx
git commit -m "feat(documents): render persistent documents list"
```

---

### Task 6: Implement the read-only document detail page

**Files:**
- Create/complete: `apps/web/src/features/documents/document-detail-page.tsx`
- Test: `apps/web/src/features/documents/document-detail-page.test.tsx`

**Interfaces:**
- Consumes: `documentId`, active scope, `loadDocumentDetail`, router navigation.
- Produces: durable, refresh-safe document detail UI.

- [ ] **Step 1: Write failing detail-page tests**

Receipt case must render:
- filename;
- movement context;
- registered 480 kg;
- document 482 kg;
- +2 kg / +0.42%;
- extraction state;
- resolution section only when resolution exists.

Sale case must render:
- 1,000 kg;
- registered R$ 3.10/kg / R$ 3,100;
- documentary R$ 3.20/kg / R$ 3,200;
- +R$ 0.10/kg / +R$ 100 / +3.23%;
- decision/justification separately from extraction.

Also test:
- processing detail does not invent extracted values;
- confidence appears when present;
- `null` detail shows exactly `Documento não encontrado neste contexto.`;
- `ABRIR MOVIMENTAÇÃO` selects the correct receipt/sale URL;
- remount/direct route reload calls `loadDocumentDetail(documentId, scope)` again.

- [ ] **Step 2: Run detail UI test and verify RED**

```bash
pnpm --filter @verdis/web test -- src/features/documents/document-detail-page.test.tsx
```

Expected: FAIL because the full detail page is not implemented.

- [ ] **Step 3: Implement factual hierarchy with existing UI primitives**

Render in this order:
1. file identity;
2. linked movement;
3. processing/review state;
4. declared data;
5. extracted data;
6. comparison;
7. human resolution.

Use `Breadcrumb`, `PageHeader`, `StatusBadge`, `Button` and existing panel/comparison styles where suitable. Do not add a new visual system.

- [ ] **Step 4: Re-run detail UI test and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/documents/document-detail-page.tsx apps/web/src/features/documents/document-detail-page.test.tsx
git commit -m "feat(documents): add read-only evidence detail"
```

---

### Task 7: Add secure original-file access

**Files:**
- Create: `apps/web/src/services/documents/open-document-file.ts`
- Test: `apps/web/src/services/documents/open-document-file.test.ts`
- Modify: `apps/web/src/features/documents/document-detail-page.tsx`
- Modify: `apps/web/src/features/documents/document-detail-page.test.tsx`

**Interfaces:**
- Consumes: `storagePath` returned only after scoped detail ownership is established.
- Produces:

```ts
export async function createDocumentFileUrl(storagePath: string): Promise<string>
```

using `supabase.storage.from('evidence-documents').createSignedUrl(storagePath, 60)` unless repository inspection reveals an already-established equivalent helper.

- [ ] **Step 1: Write failing signed-URL service tests**

Assert:
- bucket is `evidence-documents`;
- the exact persisted storage path is used;
- a short-lived signed URL is returned;
- Supabase error or missing signed URL throws a recoverable error.

- [ ] **Step 2: Run service test and verify RED**

```bash
pnpm --filter @verdis/web test -- src/services/documents/open-document-file.test.ts
```

Expected: FAIL because helper is absent.

- [ ] **Step 3: Implement signed URL helper**

Do not make the bucket public, do not expose service credentials, and do not persist the signed URL.

- [ ] **Step 4: Wire `VISUALIZAR ARQUIVO` into detail page**

On click:
1. clear previous file-open error;
2. request signed URL;
3. open/navigate to the returned URL using the browser-safe pattern already used by the app; tests may mock `window.open`;
4. if URL creation fails, preserve all detail content and show exactly `Não foi possível abrir o arquivo agora. Tente novamente.`.

- [ ] **Step 5: Run service + detail tests and verify GREEN**

```bash
pnpm --filter @verdis/web test -- \
  src/services/documents/open-document-file.test.ts \
  src/features/documents/document-detail-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/services/documents/open-document-file.ts apps/web/src/services/documents/open-document-file.test.ts apps/web/src/features/documents/document-detail-page.tsx apps/web/src/features/documents/document-detail-page.test.tsx
git commit -m "feat(documents): add secure evidence file access"
```

---

### Task 8: Prove no database migration is needed, or add the minimal safe one

**Files:**
- Inspect: `supabase/migrations/0006_documents_and_storage.sql`
- Inspect: `supabase/migrations/0007_evidence_engine.sql`
- Inspect: `supabase/migrations/0011_m1_receipts_deep_flow.sql`
- Inspect: `supabase/migrations/0012_m1_sales_deep_flow.sql`
- Optional Create: `supabase/migrations/0013_m1_documents_center.sql`
- Optional Test: `supabase/tests/0014_m1_documents_center.test.sql` (use next available repository numbering after inspection)
- Optional Modify: `apps/web/src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces either:
  - documented conclusion in commit/PR that existing RLS/Storage/schema suffice, with no migration; or
  - one minimal backward-compatible read/storage policy or scoped RPC plus pgTAP coverage.

- [ ] **Step 1: Inspect actual policies and data availability**

Verify that authenticated users with current scope permissions can:
- read documents linked to allowed movements/evidence;
- read extraction/resolution rows needed for detail;
- create a signed URL/read object from `evidence-documents` for their scoped path.

Also verify origin/failure state can be derived without a new column.

- [ ] **Step 2: Choose the smallest safe path**

If all requirements are available, add **no migration** and continue.

If one requirement is impossible or unsafe through current policies, first write a failing pgTAP test that demonstrates only that gap. Then add the minimal migration/RPC/policy necessary. Do not introduce a generic documents API layer.

- [ ] **Step 3: If migration exists, run targeted database test and regenerate types**

```bash
supabase test db
supabase gen types typescript --local --schema public > apps/web/src/lib/supabase/database.types.ts
```

Expected: pgTAP PASS and generated type diff contains only the intended contract change.

- [ ] **Step 4: Commit only if repository content changed**

Example when a migration is required:

```bash
git add supabase/migrations/0013_m1_documents_center.sql supabase/tests apps/web/src/lib/supabase/database.types.ts
git commit -m "fix(documents): enforce scoped document reads"
```

---

### Task 9: Run full regression and acceptance matrix

**Files:**
- No product changes expected; fix only defects revealed by verification.

**Interfaces:**
- Consumes all tasks above.
- Produces evidence that DOC-01 through DOC-10 and existing Receipt/Sale flows remain valid.

- [ ] **Step 1: Run full web unit suite**

```bash
pnpm test
```

Expected: all web tests PASS with zero failures.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS with zero TypeScript errors.

- [ ] **Step 3: Run production build**

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Run complete database suite**

```bash
supabase start
supabase test db
supabase gen types typescript --local --schema public > /tmp/database.types.ts
diff -u apps/web/src/lib/supabase/database.types.ts /tmp/database.types.ts
supabase stop
```

Expected:
- Supabase starts successfully;
- all pgTAP tests PASS;
- generated TypeScript contract diff is empty;
- Supabase stops successfully.

- [ ] **Step 5: Verify acceptance scenarios explicitly**

Map tests/evidence to:
- DOC-01 persistent receipt+sale list;
- DOC-02 processing not review-required;
- DOC-03 receipt 480/482 divergence;
- DOC-04 sale 3.10/3.20 divergence;
- DOC-05 resolved divergence;
- DOC-06 registered-only with no invented extraction;
- DOC-07 out-of-scope neutral not-found;
- DOC-08 file unavailable keeps metadata visible;
- DOC-09 correct movement return route;
- DOC-10 durable direct refresh.

If any scenario lacks a deterministic test, add that test before proceeding.

- [ ] **Step 6: Commit verification-driven fixes, if any**

Use narrowly scoped commit messages tied to the defect. Do not create a no-op verification commit.

---

### Task 10: Open/stack Documents PR and let GitHub Actions be the execution gate

**Files:**
- PR metadata only.

**Interfaces:**
- Base branch: `feat/m1-cooperative-shell-overviews`.
- Head branch: `feat/m1-documents-center`.
- Produces a reviewable PR with CI evidence; no merge into `main`.

- [ ] **Step 1: Create branch before implementation if not already created**

```bash
git checkout feat/m1-cooperative-shell-overviews
git pull
git checkout -b feat/m1-documents-center
```

In the GitHub-connector workflow, create `feat/m1-documents-center` from the current `feat/m1-cooperative-shell-overviews` head before the first product-code commit.

- [ ] **Step 2: Push/open stacked PR**

PR title:

```text
feat(documents): implement persistent M1 documents center
```

PR body must summarize:
- scoped durable list;
- read-only detail;
- receipt/sale origin mapping;
- processing/review semantics;
- secure file access;
- routing/refresh;
- whether a migration was necessary;
- exact final CI run evidence.

- [ ] **Step 3: Observe GitHub Actions jobs**

Required final jobs/steps:
- web unit tests PASS;
- typecheck PASS;
- build PASS;
- database pgTAP PASS;
- generated TypeScript contract diff PASS.

If CI fails, fetch exact job logs, apply only root-cause fixes under TDD, and repeat until a fresh full run is green.

- [ ] **Step 4: Update PR body with final SHA and workflow evidence**

Record exact head SHA, workflow run ID/number, web/database job outcomes and migration decision.

- [ ] **Step 5: Stop before integration**

Leave the Documents PR open and mergeable for review. Do not merge it into `feat/m1-cooperative-shell-overviews` or `main` until the human explicitly selects the integration option.
