# VERDIS M1 Documents Center Design

## 1. Objective

Implement the persistent M1 Documents Center as the third operational read model of the VERDIS Cooperative Pilot, replacing the current `/documentos` demo-data screen with a scoped, durable, read-only view over evidence already created by Receipts and Sales.

The center is not a new upload entry point. Documents continue to originate inside the operational flows that own their business context:

- Receipts create receipt evidence documents;
- Sales create sale evidence documents;
- the Documents Center exposes those durable records for consultation, traceability and review.

The center follows the approved principle:

> AI interprets. The document proves.

The M1 Documents Center must let an operator answer, for any stored file:

1. What file is this?
2. Which movement does it belong to?
3. What was declared by the operator?
4. What did extraction identify?
5. Did the two sides match or diverge?
6. Was a human decision required and, if so, what was decided?
7. Can I return to the originating Receipt or Sale?

## 2. Scope

### In scope

- persistent list of documents in the active tenant/organization/unit scope;
- read-only document detail;
- origin classification for receipt and sale evidence;
- extraction lifecycle status;
- declared fields versus extracted fields;
- confidence metadata when present;
- derived comparison state;
- linked movement context;
- linked material context;
- linked human resolution/validation when present;
- navigation back to the originating movement;
- filters for origin, processing/review state, material and time period;
- URL-addressable detail that survives refresh;
- RLS and permission enforcement through existing backend rules;
- regression coverage for Receipts and Sales.

### Out of scope

- uploading documents directly from `/documentos`;
- deleting documents;
- editing extracted fields;
- editing movement data;
- approving/rejecting evidence from the Documents Center;
- creating stock adjustments;
- issuing fiscal documents;
- OCR/extraction implementation changes;
- generic workflow designer;
- external sharing links;
- bulk export;
- new audit/certification semantics.

Any future action workflow belongs in Pendências or the owning movement flow, not in this M1 slice.

## 3. Product principles

1. The Documents Center is a read model over existing durable evidence, not a second source of truth.
2. Every listed document must exist in the database; no synthetic `Sem documento` rows are shown.
3. Healthy processing is not a pending item.
4. Extraction state and human validation remain separate concepts.
5. A processed document is not automatically `validated`, `audited`, `certified` or `compliant`.
6. The original file, claimed fields, extracted fields and human resolution remain independently inspectable.
7. The center never silently changes canonical movement, sale or receipt facts.
8. Active tenant/organization/unit scope controls all reads.
9. Existing visual language, shell, spacing, badges and typography remain unchanged.
10. The page may derive presentation labels, but all material facts come from durable backend records.

## 4. Existing persistence reused

The implementation must reuse the existing M1 schema introduced by the core foundation, Receipts and Sales slices.

Relevant durable objects include:

- `documents`
- `evidence`
- `document_extractions`
- `validations` / persisted human resolution records already used by Receipts and Sales
- `movements`
- `movement_items`
- `materials`
- `sales`
- receipt-related movement facts
- stock ledger only when movement context requires it; stock is not a document fact

No duplicate `document_center_*` tables should be introduced for M1.

## 5. Architecture

The feature is split into four focused frontend/backend concerns.

### 5.1 DocumentsQueryService

A new read service loads the paged document list for the active scope.

Responsibilities:

- apply tenant/organization/unit filters;
- return only actual documents;
- join or separately hydrate movement/material context;
- identify document origin as `receipt` or `sale` from durable evidence/movement facts;
- expose extraction lifecycle state;
- expose whether human review is required based on durable divergence/resolution state;
- sort newest first by durable document/movement timestamps;
- support M1 filters without changing canonical records.

The service must return a dedicated view model instead of leaking raw Supabase row shapes into React components.

Suggested list item shape:

```ts
interface DocumentListItem {
  documentId: string
  movementId: string
  origin: 'receipt' | 'sale'
  filename: string
  mimeType: string | null
  occurredAt: string
  materialId: string | null
  materialLabel: string | null
  extractionStatus: 'processing' | 'processed' | 'failed'
  reviewState: 'none' | 'required' | 'resolved'
  movementLabel: string
}
```

Exact internal naming may follow existing generated database types, but the UI contract should remain this clear.

### 5.2 DocumentDetailService

A dedicated read service loads one document by ID within the active scope.

It composes:

- document metadata;
- movement metadata;
- origin-specific context;
- material;
- evidence claimed fields;
- latest usable extraction;
- extraction confidence metadata when stored;
- comparison state;
- persisted human decision/resolution if any.

Suggested detail states:

- `processing`
- `processed_match`
- `processed_divergence_unresolved`
- `processed_divergence_resolved`
- `failed`
- `registered_only`

These are presentation/view-model states, not new database enums.

### 5.3 DocumentsPage

Replace the current demo-data page with a persistent list driven by `DocumentsQueryService`.

The existing shell remains frozen.

The page contains:

- breadcrumb;
- title and description;
- metric cards derived from the loaded dataset;
- filter bar;
- persistent document rows;
- loading, empty and error states.

No fake counts are shown before data is loaded.

### 5.4 DocumentDetailPanel/Page

M1 should use a URL-addressable document detail route while preserving the existing `/documentos` entry point.

Preferred route:

`/documentos/:documentId`

A query-string fallback such as `/documentos?document=<id>` is acceptable only if changing the current minimal router to support the segment would create disproportionate risk. The implementation plan should choose one deterministic pattern and test refresh/back-forward behavior.

The detail can render as a page using existing layout primitives; a modal is not required for M1.

## 6. List behavior

### 6.1 Metrics

The top metrics are computed from durable documents in the current scope.

M1 metric labels:

- `Documentos vinculados`
- `Processados`
- `Processando`
- `Requer revisão`

`Requer revisão` means a real human action is outstanding because a usable extraction has a material divergence without a persisted resolution.

It must not count normal extraction processing.

### 6.2 Filters

M1 filters:

- search by filename or linked movement label;
- origin: all / receipt / sale;
- state: all / processing / processed / failed / requires review;
- material;
- period.

Filtering may be server-side or client-side depending on the current dataset/query architecture, but it must operate only on durable scoped records.

For the pilot, client-side filtering after a scoped bounded query is acceptable if documented and tested. Do not introduce pagination infrastructure unless the existing repository already needs it for this dataset.

### 6.3 Row content

Each row shows:

- filename;
- MIME label when available;
- movement date/time;
- movement origin/type;
- material label when available;
- extraction/review status;
- action `VISUALIZAR`;
- action `ABRIR MOVIMENTAÇÃO`.

The row must not claim a document is `validado`, `auditado`, `certificado` or `conforme` merely because extraction completed.

## 7. Document status model

The UI must separate machine processing from human action.

### `Processando`

The document exists and extraction is not yet in a usable terminal state.

Copy:

- badge: `Processando`
- helper: `O arquivo foi enviado e está sendo processado.`

No pending count is created from this state.

### `Processado`

A usable extraction exists and there is no unresolved actionable divergence.

This may mean either:

- extracted values match relevant claimed values; or
- a divergence existed and a human resolution has already been persisted.

The detail must make the distinction visible even if the list uses the same high-level processed badge.

### `Falha de processamento`

Extraction failed or produced a durable failure state.

This is a document processing problem. Whether it appears later in Pendências is a separate product decision, but the Documents Center may show the failure fact.

### `Requer revisão`

A usable extraction contains an actionable divergence and no persisted human resolution exists.

This is the only M1 list state among the normal evidence lifecycle states that explicitly indicates outstanding human work.

## 8. Origin-specific comparison

The detail service must normalize origin-specific facts without hiding their meaning.

### 8.1 Receipt evidence

Relevant comparison fields for the existing M1 receipt flow:

- claimed `quantity_kg`;
- extracted `quantity_kg`;
- absolute difference;
- percent difference when derivable;
- persisted decision when present;
- justification when present.

Example approved receipt scenario:

- registered: 480 kg
- document: 482 kg
- difference: +2 kg / +0.42%

### 8.2 Sale evidence

Relevant comparison fields for the existing M1 sale flow:

- claimed `quantity_kg`;
- claimed `unit_price`;
- claimed `total_amount`;
- extracted quantity;
- extracted unit price;
- extracted total;
- derived commercial differences;
- persisted decision;
- justification when present.

Example approved sale scenario:

- quantity: 1,000 kg
- registered unit price: R$ 3.10/kg
- document unit price: R$ 3.20/kg
- registered total: R$ 3,100.00
- document total: R$ 3,200.00
- difference: +R$ 0.10/kg / +R$ 100.00 / +3.23%

The detail page may use origin-specific sections. Do not force receipt and sale fields into a misleading universal comparison table.

## 9. Human resolution display

When a persisted human resolution exists, the detail shows it as a separate section.

Display:

- decision label;
- resolution timestamp when available;
- operator/actor identity only if the current data model safely exposes a displayable identifier;
- justification when present.

Examples of neutral labels:

Receipt:

- `Valor do documento adotado`
- `Valor registrado mantido`
- `Confirmado com valor registrado`

Sale:

- `Valores do documento adotados`
- `Valores registrados mantidos`
- `Confirmada com valores registrados`

Never relabel a human resolution as an AI conclusion.

## 10. File access

The original file remains the primary evidence artifact.

`VISUALIZAR ARQUIVO` should resolve the existing Storage object through the safest currently supported mechanism in the repository/Supabase setup.

Requirements:

- no public bucket assumption unless already configured;
- no permanent unauthenticated URL embedded in the database;
- respect the same scope/authorization model used when the document was created;
- signed URL generation is acceptable when required by private Storage;
- failure to obtain a file URL must show a recoverable UI error without losing the document metadata view.

The implementation plan must inspect existing Storage helpers before adding a new access abstraction.

## 11. Movement navigation

Each document must provide a deterministic path back to its owning movement.

Receipt:

`/recebimentos/novo/:movementId?step=concluir`

Sale:

`/vendas/nova/:movementId?step=concluir`

If the movement is still draft, existing route guards decide the latest allowed step. The Documents Center should not duplicate wizard-state rules.

## 12. Error handling

### List load failure

Show a page-level recoverable error:

`Não foi possível carregar os documentos deste contexto.`

Do not fall back to demo data.

### Detail not found or outside scope

Show a neutral not-found/access response:

`Documento não encontrado neste contexto.`

Do not reveal whether the ID exists in another tenant or organization.

### File URL failure

Keep metadata/detail visible and show:

`Não foi possível abrir o arquivo agora. Tente novamente.`

### Partial related-data absence

A real document may exist even if optional extraction or validation data does not. The service must model absence explicitly rather than fail the whole detail unless a required ownership/scope invariant is broken.

## 13. Security and multi-tenancy

All reads must remain constrained by existing RLS and the active scope.

The frontend must not rely solely on client-side filters for tenant isolation.

Required invariants:

- document belongs to active tenant;
- linked movement belongs to active organization/unit where applicable;
- related evidence/extraction/validation rows are reachable only through authorized records;
- direct navigation to another scope's document ID yields no data;
- file access respects private Storage policies.

Do not add service-role credentials or privileged keys to the frontend.

## 14. UI and visual contract

The implementation must preserve VERDIS UI SYSTEM V1.1.

Use existing:

- `AppShell`
- `Breadcrumb`
- `PageHeader`
- `MetricCard`
- `FilterBar`
- `Button`
- `StatusBadge`
- existing spacing, typography and responsive rules.

No new visual family is required.

Status tones:

- processed: positive or neutral-positive existing token;
- processing: processing/info token;
- requires review: attention token;
- failed: error token.

The detail should prioritize factual hierarchy:

1. file identity;
2. linked movement;
3. processing state;
4. declared data;
5. extracted data;
6. comparison;
7. human resolution.

## 15. Loading and empty states

### Initial loading

Use a simple existing panel/list loading treatment. Do not flash demo metrics.

### Empty documents

Copy:

`Nenhum documento vinculado neste contexto.`

Helper:

`Os documentos enviados em Recebimentos e Vendas aparecerão aqui.`

### No filter matches

Copy:

`Nenhum documento encontrado com os filtros atuais.`

Provide a clear `Limpar filtros` action.

## 16. Data freshness and refresh durability

The Documents Center is durable by construction because it reads backend facts on every load.

Refresh requirements:

- `/documentos` reloads list from Supabase;
- direct detail URL reloads the same document detail;
- processing state reflects latest durable extraction status;
- resolved divergence remains resolved after refresh;
- no page depends on previous React state from Receipt/Sale flows.

No realtime subscription is required for M1. Manual page refresh or normal navigation reload is sufficient unless the repository already has a standard query refresh policy.

## 17. Router behavior

The minimal History API router remains the accepted routing approach.

Add deterministic matching for document detail without adding an external routing dependency.

Required behavior:

- `/documentos` → list;
- `/documentos/:documentId` → detail, if segment route is chosen;
- browser back returns to the previous list/filter state when technically practical within the existing router;
- direct refresh on detail reconstructs from backend;
- unknown document routes do not crash the app.

## 18. Testing strategy

Implementation must follow TDD.

### 18.1 Service tests

`DocumentsQueryService`:

- scopes queries by tenant/organization/unit;
- returns only actual documents;
- maps receipt origin correctly;
- maps sale origin correctly;
- maps processing/processed/failed states;
- derives unresolved review state only for actionable unresolved divergence;
- does not classify healthy processing as pending/review-required.

`DocumentDetailService`:

- reconstructs receipt document detail;
- reconstructs sale document detail;
- handles no extraction;
- handles processing extraction;
- handles matching extraction;
- handles unresolved divergence;
- handles resolved divergence;
- includes justification when persisted;
- rejects/not-founds out-of-scope documents without leakage.

### 18.2 UI tests

Documents list:

- no demo-data dependency;
- renders durable metrics;
- filters by origin/state/material/search;
- shows empty state;
- opens detail;
- opens linked movement.

Document detail:

- renders filename and movement context;
- renders original claimed values;
- renders extracted values only when they exist;
- renders confidence when present;
- renders comparison state;
- renders human resolution separately;
- keeps metadata visible if file URL resolution fails;
- direct route refresh works with mocked durable services.

### 18.3 Regression gates

All existing tests remain green, including:

- Receipt persistent flow;
- Receipt durable completion;
- Sale persistent flow;
- Sale durable completion;
- navigation tests;
- scope provider tests;
- database pgTAP suite;
- generated TypeScript database contract diff;
- typecheck;
- production build.

## 19. Database changes

The preferred M1 implementation uses existing tables and policies.

No migration should be added merely to simplify frontend joins.

A migration is justified only if inspection proves one of these is missing:

- a safe scoped read RPC necessary to avoid impossible/unsafe client composition;
- a Storage access policy required for authenticated document viewing;
- a durable field required to distinguish evidence origin or extraction failure that cannot be derived reliably from existing records.

If a migration becomes necessary, it must be minimal, backward compatible with Receipts/Sales and covered by pgTAP.

## 20. Performance boundaries

M1 is a cooperative pilot, not a large document management system.

Prefer:

- scoped bounded queries;
- existing indexed foreign keys;
- a small number of deterministic hydration queries;
- no speculative caching infrastructure;
- no new search engine;
- no background indexing subsystem.

If query count becomes excessive, introduce one scoped read RPC/view only after measuring the current composition and proving the need.

## 21. Acceptance scenarios

### DOC-01 — Persistent list

Given receipt and sale documents exist in the active scope, opening `/documentos` shows both from Supabase with no demo fixtures.

### DOC-02 — Processing is healthy

A newly uploaded document with pending extraction appears as `Processando` and does not increase `Requer revisão`.

### DOC-03 — Receipt match/divergence

A receipt document with claimed 480 kg and extracted 482 kg shows both values and +2 kg / +0.42% comparison.

### DOC-04 — Sale divergence

A sale document shows 1,000 kg, R$ 3.10/kg / R$ 3,100 registered versus R$ 3.20/kg / R$ 3,200 documentary values and the approved +R$ 0.10 / +R$ 100 / +3.23% differences.

### DOC-05 — Resolved divergence

When the owning flow has a persisted `keep_registered` or `use_document` resolution, the document detail shows the decision and justification separately from extraction and no longer reports outstanding review.

### DOC-06 — Registered only

A movement confirmed without a usable extraction may still show its linked document if one exists, but the detail must not invent extracted values or a successful validation.

### DOC-07 — Out-of-scope direct URL

A user navigating directly to a document ID from another scope receives `Documento não encontrado neste contexto.` and no cross-tenant metadata.

### DOC-08 — File unavailable

If signed URL/file access fails, metadata and evidence comparison remain visible and the user sees a retryable file-open error.

### DOC-09 — Return to movement

Receipt documents navigate to the receipt flow; sale documents navigate to the sale flow. Posted movements resolve to their durable conclusion through existing guards.

### DOC-10 — Refresh

Refreshing a detail route reproduces filename, movement, claimed fields, extracted fields, decision and justification from durable backend facts.

## 22. Definition of done

The M1 Documents Center is complete when:

1. `/documentos` no longer imports or renders `demo-data`;
2. list metrics and rows come from scoped durable records;
3. receipt and sale document origins are correctly identified;
4. processing, processed, failed and review-required semantics are separated correctly;
5. a URL-addressable detail reconstructs durable evidence facts;
6. claimed fields and extracted fields remain visibly separate;
7. human resolution is displayed separately from extraction;
8. original file viewing respects authenticated Storage access;
9. movement navigation works for Receipts and Sales;
10. direct refresh works;
11. out-of-scope IDs do not leak data;
12. all existing Receipt and Sale regressions remain green;
13. web tests, typecheck, build, pgTAP and generated TypeScript contract gate all pass.

## 23. Recommended implementation sequence

1. add failing tests for durable document list and detail view models;
2. implement scoped query/detail services against existing schema;
3. add router matcher/detail navigation tests;
4. replace `DocumentsPage` demo-data with service-backed list;
5. implement read-only detail page;
6. add secure original-file access using existing Storage patterns;
7. add filter/empty/error states;
8. run Receipt and Sale regressions;
9. run full web/database CI gates;
10. update PR #4 evidence after the full branch is green.

This sequence keeps the change read-only, incremental and compatible with the already verified Receipts and Sales vertical slices.