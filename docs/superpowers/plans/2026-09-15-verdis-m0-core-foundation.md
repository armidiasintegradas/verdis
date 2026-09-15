# Verdis M0 — Core Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fundação técnica testável da Verdis: workspace, Supabase/PostgreSQL, multi-tenancy, autenticação/autorização, materiais, movimentações, evidências, validação, estoque derivado, auditoria e uma shell web mínima para provar o Core.

**Architecture:** A Verdis será um monorepo leve com `apps/web` para a aplicação React/TypeScript e `supabase/` para banco, Auth, Storage e RLS. O domínio será modelado no PostgreSQL e protegido no nível de dados; a interface consome apenas dados permitidos pelas políticas e usa serviços TypeScript pequenos para operações que exigem coordenação. Dashboards completos ficam fora da M0.

**Tech Stack:** React + TypeScript + Vite; pnpm workspace; Supabase Auth/PostgreSQL/Storage/RLS; `@supabase/supabase-js`; Zod; TanStack Query; Vitest + Testing Library; pgTAP/Supabase database tests; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-15-verdis-core-foundation-design.md`

## Global Constraints

- GitHub é a fonte da verdade para código, documentação, migrations, issues e PRs.
- Stitch será usado para UX/UI das grandes interfaces, não para definir regras de domínio.
- Antigravity implementará somente decisões já registradas e versionadas.
- O MVP v1 é `Resíduos + Circularidade + Evidências`.
- A unidade central do sistema é a movimentação ambiental comprovável.
- `VALIDATED` e `AUDITED` são estados diferentes; IA nunca atribui `AUDITED`.
- O arquivo original de evidência é preservado; extrações e metadados podem evoluir.
- Estoque deriva de lançamentos válidos; correções relevantes preservam histórico.
- Autorização de interface nunca substitui autorização no banco/backend.
- Nenhum segredo pode existir no frontend ou no GitHub.
- M0 não inclui dashboards finais de Cooperativas, Empresas, Eventos ou Gestão Pública.

---

## File Map

### Repository root
- `package.json` — scripts de workspace e comandos de qualidade.
- `pnpm-workspace.yaml` — declaração dos workspaces.
- `tsconfig.base.json` — opções TypeScript compartilhadas.
- `.gitignore` — exclusões de build, ambiente e Supabase local.
- `.env.example` — apenas nomes de variáveis públicas/locais, sem segredos.

### Web app
- `apps/web/package.json` — dependências e scripts da aplicação.
- `apps/web/vite.config.ts` — Vite + alias `@/`.
- `apps/web/src/main.tsx` — bootstrap React.
- `apps/web/src/app/router.tsx` — rotas mínimas da M0.
- `apps/web/src/app/providers.tsx` — QueryClient + Auth/Scope providers.
- `apps/web/src/lib/supabase/client.ts` — único cliente browser Supabase.
- `apps/web/src/lib/env.ts` — validação das variáveis de ambiente.
- `apps/web/src/features/auth/*` — sessão e login.
- `apps/web/src/features/scope/*` — seleção de tenant/organização/unidade.
- `apps/web/src/features/core-inspector/*` — UI técnica mínima para provar o Core, não produto final.
- `apps/web/src/domain/*` — schemas Zod e tipos de aplicação.
- `apps/web/src/services/*` — operações Supabase pequenas e testáveis.

### Supabase
- `supabase/config.toml` — configuração local.
- `supabase/migrations/0001_extensions_and_enums.sql` — extensões e enums.
- `supabase/migrations/0002_identity_and_tenancy.sql` — tenants, organizations, units, profiles.
- `supabase/migrations/0003_authorization.sql` — roles, permissions, memberships e helpers RLS.
- `supabase/migrations/0004_materials_and_counterparties.sql` — catálogo e contrapartes.
- `supabase/migrations/0005_movements_and_weighings.sql` — Movement + Weighing.
- `supabase/migrations/0006_documents_and_storage.sql` — metadata documental e bucket privado.
- `supabase/migrations/0007_evidence_engine.sql` — evidence, extraction, validation, reconciliation.
- `supabase/migrations/0008_stock_and_audit.sql` — ledger, snapshots e auditoria.
- `supabase/seed.sql` — dados locais determinísticos.
- `supabase/tests/database/*.sql` — pgTAP por domínio.

### Automation
- `.github/workflows/ci.yml` — lint, typecheck, unit tests e database tests.

---

### Task 1: Scaffold the workspace and test harness

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/app.tsx`
- Create: `apps/web/src/test/setup.ts`
- Test: `apps/web/src/app/app.test.tsx`

**Interfaces:**
- Consumes: none.
- Produces: runnable React app, Vitest harness, root scripts `dev`, `build`, `typecheck`, `test`, `test:db`.

- [ ] **Step 1: Write the failing smoke test**

```tsx
// apps/web/src/app/app.test.tsx
import { render, screen } from '@testing-library/react'
import { App } from './app'

test('renders Verdis core shell', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /verdis core/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm --filter @verdis/web test -- app.test.tsx`

Expected: FAIL because the workspace/app does not exist yet.

- [ ] **Step 3: Create the minimal workspace and app**

Root `package.json` must expose:

```json
{
  "name": "verdis",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @verdis/web dev",
    "build": "pnpm --filter @verdis/web build",
    "typecheck": "pnpm --filter @verdis/web typecheck",
    "test": "pnpm --filter @verdis/web test",
    "test:db": "supabase test db"
  }
}
```

`apps/web/src/app/app.tsx` minimal:

```tsx
export function App() {
  return <main><h1>Verdis Core</h1></main>
}
```

- [ ] **Step 4: Run quality checks**

Run:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example apps/web
git commit -m "chore: scaffold Verdis workspace"
```

---

### Task 2: Create the Supabase local project and core enums

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_extensions_and_enums.sql`
- Test: `supabase/tests/database/0001_extensions_and_enums.test.sql`

**Interfaces:**
- Consumes: Supabase CLI.
- Produces: deterministic local Postgres with enums used by later migrations.

- [ ] **Step 1: Write the failing database test**

```sql
begin;
select plan(4);
select has_type('public', 'tenant_status');
select has_type('public', 'membership_status');
select has_type('public', 'movement_type');
select has_type('public', 'evidence_level');
select * from finish();
rollback;
```

- [ ] **Step 2: Run and verify failure**

Run: `supabase start && supabase test db`

Expected: FAIL because the enums do not exist.

- [ ] **Step 3: Add enums and required extension**

`0001_extensions_and_enums.sql` must create `pgcrypto` and these enum values:

```sql
create type public.tenant_status as enum ('active','suspended','archived');
create type public.membership_status as enum ('active','invited','suspended','ended');
create type public.movement_type as enum (
  'receipt','inbound','outbound','collection','transfer',
  'sorting','sale','destination','reject','adjustment'
);
create type public.movement_status as enum ('draft','posted','voided');
create type public.evidence_level as enum (
  'AUTODECLARED','EVIDENCED','DOCUMENT_VERIFIED',
  'VALIDATED','RECONCILED','TRACEABILITY_PROVEN','AUDITED'
);
create type public.review_status as enum ('pending','accepted','rejected','needs_review');
```

- [ ] **Step 4: Reset and test**

Run: `supabase db reset && supabase test db`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -m "feat: initialize Supabase core types"
```

---

### Task 3: Implement tenant, organization, unit and user profile tables

**Files:**
- Create: `supabase/migrations/0002_identity_and_tenancy.sql`
- Test: `supabase/tests/database/0002_identity_and_tenancy.test.sql`

**Interfaces:**
- Consumes: enums from Task 2.
- Produces: `tenants`, `organizations`, `units`, `user_profiles`, stable tenant/org/unit identifiers.

- [ ] **Step 1: Write schema tests**

```sql
begin;
select plan(8);
select has_table('public','tenants');
select has_table('public','organizations');
select has_table('public','units');
select has_table('public','user_profiles');
select col_is_pk('public','tenants','id');
select col_is_fk('public','organizations','tenant_id');
select col_is_fk('public','units','organization_id');
select col_is_fk('public','user_profiles','user_id');
select * from finish();
rollback;
```

- [ ] **Step 2: Run and verify failure**

Run: `supabase test db`

Expected: FAIL with missing tables.

- [ ] **Step 3: Implement tables and constraints**

Minimum shape:

```sql
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text not null,
  status public.tenant_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  legal_name text not null,
  display_name text not null,
  tax_id text,
  created_at timestamptz not null default now(),
  unique (tenant_id, tax_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
```

Add a trigger that rejects any `units.tenant_id` different from its parent organization tenant.

- [ ] **Step 4: Reset and test**

Run: `supabase db reset && supabase test db`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0002_identity_and_tenancy.sql supabase/tests/database/0002_identity_and_tenancy.test.sql
git commit -m "feat: add tenant organization and unit model"
```

---

### Task 4: Implement granular roles, permissions, memberships and RLS helpers

**Files:**
- Create: `supabase/migrations/0003_authorization.sql`
- Test: `supabase/tests/database/0003_authorization.test.sql`

**Interfaces:**
- Consumes: `tenants`, `organizations`, `units`, `auth.users`.
- Produces: `roles`, `permissions`, `role_permissions`, `memberships`, `app_private.has_permission(...)`.

- [ ] **Step 1: Write authorization tests**

Test must create two tenants, one user membership in tenant A, grant `movement.read`, then assert:

```sql
select ok(
  app_private.has_permission(v_user_a, v_tenant_a, v_org_a, null, 'movement.read'),
  'member receives granted permission'
);
select ok(
  not app_private.has_permission(v_user_a, v_tenant_b, v_org_b, null, 'movement.read'),
  'permission never crosses tenant boundary'
);
```

Also assert that a suspended membership returns false.

- [ ] **Step 2: Run and verify failure**

Run: `supabase test db`

Expected: FAIL because authorization objects do not exist.

- [ ] **Step 3: Implement the authorization model**

Required tables:

```text
roles(id, code, name, scope_kind, built_in)
permissions(code, description)
role_permissions(role_id, permission_code)
memberships(id, tenant_id, organization_id, unit_id?, user_id, role_id, status, starts_at, ends_at?)
```

Seed at least these permission codes in the migration:

```text
movement.create
movement.read
movement.correct
evidence.upload
evidence.read
evidence.validate
stock.read
sale.create
audit.read
report.generate
scope.manage
```

`app_private.has_permission` must be `security definer`, use a fixed `search_path`, require an active membership, match tenant and organization, and respect optional unit scope.

- [ ] **Step 4: Enable RLS on identity tables**

Policies must allow a user to read only rows within scopes for which `app_private.has_permission` or membership presence authorizes access. Do not use frontend role checks as a substitute.

- [ ] **Step 5: Reset and test**

Run: `supabase db reset && supabase test db`

Expected: PASS including cross-tenant denial.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0003_authorization.sql supabase/tests/database/0003_authorization.test.sql
git commit -m "feat: add scoped authorization and RLS helpers"
```

---

### Task 5: Add materials and counterparties

**Files:**
- Create: `supabase/migrations/0004_materials_and_counterparties.sql`
- Test: `supabase/tests/database/0004_materials_and_counterparties.test.sql`

**Interfaces:**
- Consumes: tenancy and authorization helpers.
- Produces: `materials`, `material_aliases`, `counterparties`.

- [ ] **Step 1: Write failing tests**

Assert:

```sql
select has_table('public','materials');
select has_table('public','material_aliases');
select has_table('public','counterparties');
```

Insert two materials with same `code` in one tenant and expect unique violation; insert same `code` in another tenant and expect success.

- [ ] **Step 2: Run and verify failure**

Run: `supabase test db`

- [ ] **Step 3: Implement tables**

`materials` must include `tenant_id`, `code`, `name`, `category`, `default_unit` with M0 restricted to `kg`, and `active`.

`material_aliases` maps local naming to a tenant material.

`counterparties` must support both:

```text
linked_organization_id = existing Verdis participant
or
external_name + external_tax_id = non-participant
```

Require at least one representation with a CHECK constraint.

- [ ] **Step 4: Add RLS and tests**

`materials` and `counterparties` must be unreadable across tenant boundaries.

Run: `supabase db reset && supabase test db`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_materials_and_counterparties.sql supabase/tests/database/0004_materials_and_counterparties.test.sql
git commit -m "feat: add material catalog and counterparties"
```

---

### Task 6: Implement Movement and Weighing as the operational core

**Files:**
- Create: `supabase/migrations/0005_movements_and_weighings.sql`
- Test: `supabase/tests/database/0005_movements_and_weighings.test.sql`

**Interfaces:**
- Consumes: organizations, units, materials, counterparties, permissions.
- Produces: `movements`, `weighings`, immutable posted movement rules.

- [ ] **Step 1: Write behavior tests**

Tests must prove:

1. a movement cannot reference a material from another tenant;
2. `quantity_kg > 0` for normal movement types;
3. `adjustment` may use signed `quantity_kg` only through an explicit adjustment reason;
4. a posted movement cannot have quantity/material/source/destination silently changed;
5. a weighing computes net weight as `gross - tare` and rejects negative net weight.

- [ ] **Step 2: Run and verify failure**

Run: `supabase test db`

- [ ] **Step 3: Implement Movement**

Minimum fields:

```sql
id uuid primary key,
tenant_id uuid not null,
organization_id uuid not null,
unit_id uuid,
movement_type public.movement_type not null,
material_id uuid not null,
quantity_kg numeric(18,3) not null,
source_organization_id uuid,
source_unit_id uuid,
source_counterparty_id uuid,
destination_organization_id uuid,
destination_unit_id uuid,
destination_counterparty_id uuid,
occurred_at timestamptz not null,
created_by uuid not null references auth.users(id),
status public.movement_status not null default 'draft',
evidence_level public.evidence_level not null default 'AUTODECLARED',
adjustment_reason text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Use triggers to validate tenant consistency and to prevent mutation of posted mass-affecting fields. Corrections must use a new reversing/replacement movement later, not rewrite history.

- [ ] **Step 4: Implement Weighing**

Required fields:

```text
movement_id
gross_weight_kg
tare_weight_kg
net_weight_kg generated/stored from gross - tare
declared_weight_kg
weighed_at
scale_name
vehicle_plate
source_document_id nullable until Task 7
```

If the FK to `documents` cannot exist before Task 7, add it in Task 7 by ALTER TABLE; do not create a placeholder table.

- [ ] **Step 5: Add RLS and run tests**

Creation requires `movement.create`; reading requires `movement.read` in the relevant scope.

Run: `supabase db reset && supabase test db`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0005_movements_and_weighings.sql supabase/tests/database/0005_movements_and_weighings.test.sql
git commit -m "feat: add movement and weighing core"
```

---

### Task 7: Implement documents, private Storage and SHA-256 duplicate detection

**Files:**
- Create: `supabase/migrations/0006_documents_and_storage.sql`
- Create: `apps/web/src/services/documents/hash-file.ts`
- Test: `supabase/tests/database/0006_documents_and_storage.test.sql`
- Test: `apps/web/src/services/documents/hash-file.test.ts`

**Interfaces:**
- Consumes: tenant/org scope; movement/weighing.
- Produces: `documents`, private bucket `evidence-documents`, deterministic SHA-256 helper.

- [ ] **Step 1: Write SHA test**

```ts
import { hashFileSha256 } from './hash-file'

test('returns stable lowercase SHA-256 hex', async () => {
  const file = new File(['verdis'], 'ticket.txt', { type: 'text/plain' })
  expect(await hashFileSha256(file)).toMatch(/^[a-f0-9]{64}$/)
  expect(await hashFileSha256(file)).toBe(await hashFileSha256(file))
})
```

- [ ] **Step 2: Write database/storage metadata tests**

Assert `documents` exists and same `sha256` can be stored but is discoverable by indexed lookup; do not use a unique constraint because reuse must be flagged, not hidden.

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
pnpm test
supabase test db
```

- [ ] **Step 4: Implement document metadata**

Required columns:

```text
id
tenant_id
organization_id
uploaded_by
document_type
original_filename
mime_type
sha256
storage_bucket
storage_path
external_number
external_key
extraction_status
uploaded_at
```

Create index on `(tenant_id, sha256)` and `(tenant_id, external_key)`.

- [ ] **Step 5: Create private Storage bucket and policies**

Bucket name: `evidence-documents`.

Object path contract:

```text
{tenant_id}/{organization_id}/{document_id}/{original_filename}
```

Policies must require membership/permission in the tenant and organization represented by the path. Bucket must not be public.

- [ ] **Step 6: Implement browser SHA helper**

Use Web Crypto only:

```ts
export async function hashFileSha256(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 7: Add `weighings.source_document_id` FK**

Use `alter table public.weighings add constraint ... references public.documents(id)`.

- [ ] **Step 8: Run tests and commit**

Run: `pnpm test && supabase db reset && supabase test db`

```bash
git add supabase apps/web/src/services/documents
git commit -m "feat: add private document evidence storage"
```

---

### Task 8: Implement the Evidence Engine, extraction history and validations

**Files:**
- Create: `supabase/migrations/0007_evidence_engine.sql`
- Test: `supabase/tests/database/0007_evidence_engine.test.sql`

**Interfaces:**
- Consumes: movements and documents.
- Produces: `evidences`, `document_extractions`, `validations`, `reconciliations`, evidence-level transition helper.

- [ ] **Step 1: Write state tests**

Tests must prove:

- adding a document evidence can move a movement from `AUTODECLARED` to `EVIDENCED`;
- an automated validation can never set `AUDITED`;
- `AUDITED` requires a human actor user id and `validation_type='human_audit'`;
- reprocessing a document creates a new extraction row instead of overwriting the previous result;
- reconciliation can link two movements and store mass divergence.

- [ ] **Step 2: Run and verify failure**

Run: `supabase test db`

- [ ] **Step 3: Implement tables**

Required structures:

```text
document_extractions(document_id, provider, model_name, model_version, extracted_fields jsonb, raw_result jsonb, confidence, created_at)
evidences(movement_id, document_id?, evidence_type, claimed_fields jsonb, extracted_fields jsonb, confidence, status, created_by, created_at)
validations(movement_id?, evidence_id?, document_id?, validation_type, status, automated, actor_user_id?, rule_code, reason, created_at)
reconciliations(left_movement_id, right_movement_id, status, quantity_difference_kg, match_score, reviewed_by?, created_at)
```

- [ ] **Step 4: Implement controlled evidence-level promotion**

Create a function such as:

```sql
app_private.recalculate_movement_evidence_level(p_movement_id uuid)
```

It derives the highest justified level from evidence/validation/reconciliation rows. It must never infer `AUDITED`; `AUDITED` only follows an accepted human audit validation.

- [ ] **Step 5: Add RLS and test**

`evidence.upload` controls evidence creation; `evidence.validate` controls human validation; read requires the appropriate organization scope.

Run: `supabase db reset && supabase test db`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_evidence_engine.sql supabase/tests/database/0007_evidence_engine.test.sql
git commit -m "feat: add evidence validation and reconciliation engine"
```

---

### Task 9: Implement stock ledger, physical snapshots and immutable audit events

**Files:**
- Create: `supabase/migrations/0008_stock_and_audit.sql`
- Test: `supabase/tests/database/0008_stock_and_audit.test.sql`

**Interfaces:**
- Consumes: posted movements, organizations, units, materials.
- Produces: `stock_ledger_entries`, `stock_snapshots`, `audit_events`, current-stock view.

- [ ] **Step 1: Write mass-balance tests**

Tests must prove:

1. posting a 100 kg inbound movement creates `+100` ledger impact;
2. posting a 30 kg outbound movement creates `-30` impact;
3. current stock becomes `70`;
4. a further 80 kg outbound attempt is rejected unless represented as an explicit audited adjustment/exception flow;
5. voiding a posted movement creates a reversal entry rather than deleting history;
6. `audit_events` cannot be updated or deleted by application users.

- [ ] **Step 2: Run and verify failure**

Run: `supabase test db`

- [ ] **Step 3: Implement ledger and balance view**

```text
stock_ledger_entries(id, tenant_id, organization_id, unit_id, material_id, movement_id, delta_kg, occurred_at, created_at)
stock_snapshots(id, tenant_id, organization_id, unit_id, material_id, snapshot_type, quantity_kg, counted_at, created_by)
```

Create view `public.current_stock` grouped by tenant/org/unit/material from ledger entries.

- [ ] **Step 4: Implement posting/reversal behavior**

A trigger or security-definer function must create ledger entries exactly once when a movement transitions `draft -> posted`. Re-posting must be idempotent. `posted -> voided` creates the inverse ledger effect exactly once.

- [ ] **Step 5: Implement audit events**

`audit_events` fields:

```text
id, tenant_id, organization_id, actor_user_id, action,
subject_type, subject_id, previous_state jsonb, new_state jsonb,
technical_context jsonb, occurred_at
```

Triggers must record at least:

```text
movement.created
movement.posted
movement.voided
document.created
evidence.created
validation.created
reconciliation.created
membership.changed
```

Application roles get SELECT where authorized but no UPDATE/DELETE.

- [ ] **Step 6: Reset and test**

Run: `supabase db reset && supabase test db`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0008_stock_and_audit.sql supabase/tests/database/0008_stock_and_audit.test.sql
git commit -m "feat: add stock ledger and immutable audit trail"
```

---

### Task 10: Generate application types and domain schemas

**Files:**
- Create: `apps/web/src/lib/supabase/database.types.ts` (generated)
- Create: `apps/web/src/domain/movement.ts`
- Create: `apps/web/src/domain/evidence.ts`
- Create: `apps/web/src/domain/scope.ts`
- Test: `apps/web/src/domain/movement.test.ts`

**Interfaces:**
- Consumes: final local Supabase schema.
- Produces: typed DB client and runtime validation for user-entered data.

- [ ] **Step 1: Write movement schema test**

```ts
import { movementDraftSchema } from './movement'

test('rejects zero or negative normal movement quantities', () => {
  const result = movementDraftSchema.safeParse({
    movementType: 'inbound',
    materialId: crypto.randomUUID(),
    quantityKg: 0,
    occurredAt: new Date().toISOString(),
  })
  expect(result.success).toBe(false)
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm test`

- [ ] **Step 3: Generate Supabase types**

Run:

```bash
supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts
```

Do not hand-edit generated output.

- [ ] **Step 4: Implement Zod schemas**

`movementDraftSchema` must validate M0 business input before request submission while treating DB constraints as authoritative. Export inferred TypeScript types from the schemas.

- [ ] **Step 5: Test and commit**

Run: `pnpm test && pnpm typecheck`

```bash
git add apps/web/src/lib/supabase/database.types.ts apps/web/src/domain
git commit -m "feat: add typed Verdis domain contracts"
```

---

### Task 11: Implement browser Supabase client, auth session and active scope

**Files:**
- Create: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/lib/supabase/client.ts`
- Create: `apps/web/src/features/auth/auth-provider.tsx`
- Create: `apps/web/src/features/auth/login-page.tsx`
- Create: `apps/web/src/features/scope/scope-provider.tsx`
- Create: `apps/web/src/features/scope/scope-selector.tsx`
- Modify: `apps/web/src/app/app.tsx`
- Modify: `apps/web/src/app/providers.tsx`
- Test: `apps/web/src/features/scope/scope-provider.test.tsx`

**Interfaces:**
- Consumes: Supabase generated types, memberships RLS.
- Produces: authenticated session and `{ tenantId, organizationId, unitId }` application scope.

- [ ] **Step 1: Write scope behavior test**

Test that a user with memberships in two organizations can select one scope, and that selecting an organization not returned by memberships is rejected by the provider.

- [ ] **Step 2: Run and verify failure**

Run: `pnpm test`

- [ ] **Step 3: Validate environment**

`env.ts` exposes only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Use Zod and throw a clear startup error if either is missing. No service-role key belongs in the web app.

- [ ] **Step 4: Implement typed browser client**

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from '../env'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
```

- [ ] **Step 5: Implement auth and scope providers**

Auth provider listens to Supabase auth state. Scope provider loads only memberships available to the authenticated user and stores the selected valid scope in memory/local storage.

- [ ] **Step 6: Test and commit**

Run: `pnpm test && pnpm typecheck && pnpm build`

```bash
git add apps/web/src/lib apps/web/src/features apps/web/src/app
git commit -m "feat: add authenticated tenant scope shell"
```

---

### Task 12: Implement the Core Inspector vertical slice

**Files:**
- Create: `apps/web/src/services/movements/create-movement.ts`
- Create: `apps/web/src/services/movements/list-movements.ts`
- Create: `apps/web/src/services/documents/upload-evidence-document.ts`
- Create: `apps/web/src/features/core-inspector/core-inspector-page.tsx`
- Create: `apps/web/src/features/core-inspector/new-movement-form.tsx`
- Create: `apps/web/src/features/core-inspector/movement-list.tsx`
- Test: `apps/web/src/services/movements/create-movement.test.ts`
- Test: `apps/web/src/features/core-inspector/new-movement-form.test.tsx`

**Interfaces:**
- Consumes: active scope, materials, movements, documents, RLS.
- Produces: a technical M0 verification UI capable of creating and reading a movement within authorized scope and attaching a document.

- [ ] **Step 1: Write service test**

Mock the Supabase client and assert `createMovement` always sends the active `tenant_id`, `organization_id`, optional `unit_id`, authenticated user context, and never accepts these security-sensitive IDs from arbitrary form data.

- [ ] **Step 2: Run and verify failure**

Run: `pnpm test`

- [ ] **Step 3: Implement `createMovement`**

Signature:

```ts
export async function createMovement(
  scope: ActiveScope,
  input: MovementDraft,
): Promise<{ id: string }>
```

The service validates `input`, inserts `draft`, returns only the new id, and surfaces database/RLS errors without converting authorization failures into generic success.

- [ ] **Step 4: Implement document upload service**

Signature:

```ts
export async function uploadEvidenceDocument(args: {
  scope: ActiveScope
  movementId: string
  file: File
  documentType: string
}): Promise<{ documentId: string; duplicateCandidates: number }>
```

Flow:

```text
hash file -> query same tenant/hash -> generate document id -> upload private object -> insert document metadata -> insert evidence link
```

If DB insertion fails after upload, delete the just-uploaded object before returning error.

- [ ] **Step 5: Implement Core Inspector page**

This page is deliberately utilitarian. It must provide:

```text
active tenant/org/unit
new inbound/receipt movement form
material selector
quantity kg
occurred_at
list of recent movements
movement evidence level
attach evidence document
```

Do not spend design effort intended for Stitch on this screen.

- [ ] **Step 6: Run unit and manual local test**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

Manual scenario:

```text
login -> choose organization -> create 100 kg inbound -> verify list -> attach ticket -> evidence becomes EVIDENCED -> verify document is private
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/services apps/web/src/features/core-inspector
git commit -m "feat: prove Verdis core vertical slice"
```

---

### Task 13: Add deterministic local seed and end-to-end database scenario

**Files:**
- Create: `supabase/seed.sql`
- Create: `supabase/tests/database/0010_end_to_end_core.test.sql`
- Create: `docs/architecture/m0-verification.md`

**Interfaces:**
- Consumes: entire M0 schema.
- Produces: repeatable local demo data and acceptance evidence.

- [ ] **Step 1: Create deterministic seed data**

Seed exactly:

```text
Tenant: verdis-demo
Organizations: Empresa Demo, Cooperativa Demo
Units: Recife Unidade 01, Galpão Principal
Materials: PAPELAO, PET
Roles/memberships for local test users
```

Use fixed UUIDs in seed data so tests and screenshots are reproducible.

- [ ] **Step 2: Write the end-to-end database test**

Scenario:

```text
Empresa posts 120 kg outbound PAPELAO
Cooperativa posts 120 kg inbound PAPELAO
Reconciliation links both with 0 kg divergence
Cooperativa stock = 120 kg
Ticket evidence exists
Accepted validation raises evidence level appropriately
Audit events exist for the chain
```

Assert exact quantities and no cross-tenant visibility.

- [ ] **Step 3: Reset and run full verification**

Run:

```bash
supabase db reset
supabase test db
pnpm test
pnpm typecheck
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Document the acceptance scenario**

`docs/architecture/m0-verification.md` must contain the commands above and the ten MVP traceability questions from the PRD, with the exact table/view used to answer each one.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql supabase/tests/database/0010_end_to_end_core.test.sql docs/architecture/m0-verification.md
git commit -m "test: add M0 end to end verification scenario"
```

---

### Task 14: Add CI and Antigravity/Stitch handoff rules

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/workflow/antigravity.md`
- Create: `docs/workflow/stitch.md`
- Create: `docs/prompts/README.md`

**Interfaces:**
- Consumes: root scripts and Supabase local tests.
- Produces: required CI gate and stable collaboration workflow.

- [ ] **Step 1: Create CI workflow**

The workflow must run on pull requests and pushes to `main`:

```text
checkout
setup pnpm/node
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
setup Supabase CLI
supabase start
supabase test db
```

No deploy step belongs in M0 CI.

- [ ] **Step 2: Document Antigravity rules**

`docs/workflow/antigravity.md` must state:

```text
1. Read PRD + design + implementation-plan task before editing.
2. Work on one GitHub issue/task at a time.
3. Do not change DB contracts to fit UI without updating the spec.
4. Never commit secrets.
5. Run required tests before proposing completion.
6. Keep prompts that materially define implementation behavior under docs/prompts/.
```

- [ ] **Step 3: Document Stitch boundary**

`docs/workflow/stitch.md` must state that Stitch owns exploration/validation of product interface patterns, while domain rules, permissions, evidence states and database invariants remain authoritative in GitHub specs.

- [ ] **Step 4: Run final local quality gate**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
supabase db reset
supabase test db
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github docs/workflow docs/prompts
git commit -m "ci: enforce Verdis M0 quality gates"
```

---

## M0 Exit Criteria

M0 is complete only when all statements below are true:

- [ ] Local environment is reproducible with one documented setup flow.
- [ ] Tenants, organizations, units and users are modeled.
- [ ] Roles and permissions are granular and enforced by RLS/backend logic.
- [ ] A user cannot read another tenant by manipulating an identifier.
- [ ] Materials and counterparties are tenant-safe.
- [ ] Movements are the central operational record.
- [ ] Posted movements preserve mass-history and cannot be silently rewritten.
- [ ] Weighings support declared vs evidenced comparison.
- [ ] Documents are stored privately and retain SHA-256 metadata.
- [ ] Duplicate-document candidates are detectable.
- [ ] Evidence, extraction, validation and reconciliation are separately modeled.
- [ ] Automated logic cannot assign `AUDITED`.
- [ ] Stock is derived from ledger entries and mass balance is testable.
- [ ] Audit events are append-only for application users.
- [ ] A minimal authenticated web shell proves tenant/org/unit scoping.
- [ ] The Core Inspector can create a movement and attach an evidence document.
- [ ] A deterministic end-to-end scenario passes in database tests.
- [ ] Unit, type, build and database tests run in GitHub Actions.

## Deliberately Deferred to M1/M2

The following are not reasons to delay M0 completion:

- final Verdis visual language;
- full Stitch design system;
- Cooperative production UX;
- Company executive dashboard;
- Event live operations map;
- Public Management dashboard;
- PGRS/RGRS/MTR/CDF automation;
- AI/OCR provider implementation beyond the extraction data contract;
- carbon, water, energy, Social and Governance modules;
- production billing, pricing and subscription management.

## Plan Self-Review

- Spec coverage: M0 covers tenancy, authorization, materials, movement, weighing, documents, Evidence Engine, reconciliation, stock, audit, Auth shell and a vertical verification slice.
- Scope: product-specific dashboards and compliance modules are intentionally deferred.
- Type consistency: `Movement`, `ActiveScope`, evidence levels and document lifecycle are named consistently across tasks.
- Security: RLS, private Storage, no frontend secrets, immutable audit and cross-tenant tests are mandatory before exit.
- No placeholder implementation tasks remain; every deferred area is explicitly assigned to a later milestone rather than left undefined inside M0.
