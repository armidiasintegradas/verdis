# Auditoria & Rastreabilidade M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma cadeia de custódia digital auditável, com lotes genealógicos, exceções, segregação de funções, timeline e Centro de Auditoria sobre dados persistentes reais.

**Architecture:** Evoluir de forma aditiva `audit_events` como Event Ledger imutável e preservar `stock_ledger_entries` como única verdade quantitativa de estoque. Lotes e exceções são domínios separados, com comandos transacionais e read models somente leitura para UI.

**Tech Stack:** PostgreSQL/Supabase, RLS/pgTAP, React 18, TypeScript, Vitest e stack web já existente no repositório.

**Spec:** `docs/superpowers/specs/2026-09-16-audit-traceability-m1-design.md`

## Global Constraints

- Branch de execução: `feat/m1-audit-traceability`, baseada em `feat/m1-documents-center`.
- Não alterar nem fazer merge do PR #6.
- TDD obrigatório: RED → implementação mínima → GREEN → regressão → commit.
- `audit_events` permanece append-only; correções são novos eventos.
- `stock_ledger_entries` permanece a única verdade quantitativa do estoque.
- RLS em toda nova tabela pública antes de exposição ao frontend.
- Reutilizar `app_private.has_permission`; nenhuma service-role no frontend.
- Documentos continuam privados e usam URL assinada autenticada.
- Sem IA de risco, blockchain, QR obrigatório, PDFs obrigatórios ou refatoração não relacionada no M1.
- Nenhum dado sintético para preencher timeline, cadeia ou Centro de Auditoria.

---

## File map previsto

- `supabase/migrations/0009_audit_traceability_m1.sql` — schema, invariantes, comandos, RLS e eventos M1.
- `supabase/tests/database/0009_audit_traceability_m1.test.sql` — pgTAP de integridade, RLS, segregação, lotes e exceções.
- `apps/web/src/features/audit/types.ts` — contratos de leitura da UI.
- `apps/web/src/features/audit/audit-service.ts` — queries/read models escopados.
- `apps/web/src/features/audit/audit-center-page.tsx` — Centro de Auditoria.
- `apps/web/src/features/audit/audit-timeline.tsx` — timeline probatória reutilizável.
- `apps/web/src/features/audit/exception-queue.tsx` — fila operacional.
- `apps/web/src/features/audit/audit-chain.tsx` — cadeia bidirecional/lotes.
- `apps/web/src/features/audit/*.test.tsx` — testes focados de UI/serviço.
- Arquivos de rota/navegação existentes — somente alterações mínimas para expor as telas.

Os nomes finais de arquivos de rota devem seguir o padrão já presente no repo; não criar um segundo roteador.

---

### Task 1: Fundação probatória e permissões

**Files:**
- Create: `supabase/migrations/0009_audit_traceability_m1.sql`
- Create: `supabase/tests/database/0009_audit_traceability_m1.test.sql`

**Interfaces:**
- Consumes: `public.audit_events`, `app_private.has_permission`, tenants/organizations/units existentes.
- Produces: colunas/relações aditivas do ledger e permissões `audit.review`, `audit.assign`, `audit.resolve`, `audit.manage`, `traceability.read`, `traceability.operate` conforme o modelo de autorização existente.

- [ ] **Step 1: escrever pgTAP RED** provando append-only em UPDATE e DELETE, isolamento cross-tenant/cross-org e ausência inicial das novas capacidades.
- [ ] **Step 2: executar somente `0009_audit_traceability_m1.test.sql`** e confirmar falha pelas estruturas ainda inexistentes, não por erro de fixture.
- [ ] **Step 3: implementar migration mínima aditiva**, preservando eventos existentes e usando campos explícitos para correlação/causalidade/justificativa quando necessários; não esconder contratos centrais em `technical_context`.
- [ ] **Step 4: adicionar RLS/policies** reutilizando `app_private.has_permission` e escopo de unidade apenas onde a entidade realmente possuir `unit_id`.
- [ ] **Step 5: executar pgTAP da task e depois toda suíte de banco**; ambos devem passar.
- [ ] **Step 6: commit** `feat(audit): extend immutable audit ledger`.

### Task 2: Lotes digitais e genealogia

**Files:**
- Modify: `supabase/migrations/0009_audit_traceability_m1.sql`
- Modify: `supabase/tests/database/0009_audit_traceability_m1.test.sql`

**Interfaces:**
- Produces: `custody_lots`, `custody_lot_links` e comandos transacionais de criação/consumo/split/merge.
- Invariants: quantidade > 0 na origem; consumo <= disponível; split/merge conservam massa; sem ciclos; material/tenant/org/unit compatíveis.

- [ ] **Step 1: adicionar testes RED** para criação de lote, consumo parcial, over-consumption, split válido/inválido, merge, escopo/material incompatível e tentativa de ciclo.
- [ ] **Step 2: executar pgTAP** e confirmar RED pelos contratos ausentes.
- [ ] **Step 3: implementar tabelas e constraints mínimas**; manter quantidade originada imutável e representar consumo por fatos/links, não sobrescrita histórica.
- [ ] **Step 4: implementar comandos transacionais/idempotentes** para split, merge e consumo, com lock/checagem suficiente para impedir dupla alocação concorrente.
- [ ] **Step 5: emitir `lot.created`, `lot.split`, `lot.merged`, `lot.consumed` no Event Ledger** dentro da mesma transação da operação.
- [ ] **Step 6: rodar pgTAP focado + suíte completa**.
- [ ] **Step 7: commit** `feat(traceability): add custody lot genealogy`.

### Task 3: Fila de exceções e segregação de funções

**Files:**
- Modify: `supabase/migrations/0009_audit_traceability_m1.sql`
- Modify: `supabase/tests/database/0009_audit_traceability_m1.test.sql`

**Interfaces:**
- Produces: `audit_exceptions` e comandos de abrir, assumir, redistribuir e resolver.
- Resolution: `confirmed | corrected | justified | rejected | escalated`.
- State: `open | in_review | resolved | rejected | escalated`.

- [ ] **Step 1: escrever RED** para abertura sem responsável, claim, redistribuição autorizada, resolução estruturada, falta de justificativa, `corrected` sem evento corretivo e usuário sem permissão.
- [ ] **Step 2: adicionar RED específico de segregação**: autor/corretor não pode validar a própria ação crítica.
- [ ] **Step 3: implementar estado operacional mínimo** com RLS e comandos no banco; histórico continua no Event Ledger.
- [ ] **Step 4: emitir eventos `exception.opened/assigned/reassigned/resolved/rejected/escalated`** e vincular resolução ao evento corretivo quando resultado for `corrected`.
- [ ] **Step 5: rodar testes focados + suíte de banco**.
- [ ] **Step 6: commit** `feat(audit): add exception review workflow`.

### Task 4: Read models tipados de auditoria e cadeia

**Files:**
- Create: `apps/web/src/features/audit/types.ts`
- Create: `apps/web/src/features/audit/audit-service.ts`
- Create: `apps/web/src/features/audit/audit-service.test.ts`

**Interfaces:**
- Produces: `listAuditEvents(filters)`, `getSubjectTimeline(subjectType, subjectId)`, `listAuditExceptions(filters)`, `getCustodyChain(subject)` com tipos explícitos e escopo ativo.

- [ ] **Step 1: escrever testes RED** com cliente Supabase mockado cobrindo filtros, ordenação, vazio, erro e escopo ativo.
- [ ] **Step 2: executar teste focado** e confirmar RED por módulo/funções ausentes.
- [ ] **Step 3: implementar tipos e queries mínimas**, sem service-role, realtime, cache especulativo ou linhas fabricadas.
- [ ] **Step 4: garantir que falhas do backend sejam propagadas como erro tipado** e não convertidas em estado vazio.
- [ ] **Step 5: rodar testes + typecheck**.
- [ ] **Step 6: commit** `feat(audit): add scoped audit read models`.

### Task 5: Timeline probatória reutilizável

**Files:**
- Create: `apps/web/src/features/audit/audit-timeline.tsx`
- Create: `apps/web/src/features/audit/audit-timeline.test.tsx`
- Modify: detalhes existentes de recebimento/venda/documento somente nos pontos de montagem necessários.

**Interfaces:**
- Consumes: `getSubjectTimeline`.
- Produces: componente somente leitura com evento, ator, horário, antes/depois, justificativa, evidências e relações.

- [ ] **Step 1: RED** para loading, erro, vazio, ordem cronológica, detalhe de correção e evento com validação independente.
- [ ] **Step 2: implementar componente mínimo** seguindo UI V1.1 e sem ações que editem histórico.
- [ ] **Step 3: montar a timeline nas páginas existentes** sem reestruturar os fluxos de recebimento/venda/documentos.
- [ ] **Step 4: testes focados + regressão das páginas tocadas + typecheck**.
- [ ] **Step 5: commit** `feat(audit): add evidentiary timelines`.

### Task 6: Centro de Auditoria

**Files:**
- Create: `apps/web/src/features/audit/audit-center-page.tsx`
- Create: `apps/web/src/features/audit/audit-center-page.test.tsx`
- Modify: rota/menu existentes.

**Interfaces:**
- Consumes: `listAuditEvents`.
- Filters: período, organização, unidade, tipo, material, usuário, lote, entidade, estado de exceção e responsável quando aplicável.

- [ ] **Step 1: RED** para render, filtros, loading/erro/vazio, ausência de dados sintéticos e drill-down.
- [ ] **Step 2: implementar página mínima** usando padrões visuais/navegação existentes.
- [ ] **Step 3: adicionar rota e navegação** usando o roteador atual.
- [ ] **Step 4: testes focados + typecheck + build**.
- [ ] **Step 5: commit** `feat(audit): add audit center`.

### Task 7: Fila operacional de exceções

**Files:**
- Create: `apps/web/src/features/audit/exception-queue.tsx`
- Create: `apps/web/src/features/audit/exception-queue.test.tsx`
- Modify: `apps/web/src/features/audit/audit-service.ts`

**Interfaces:**
- Consumes: `listAuditExceptions` e comandos autenticados correspondentes.
- Produces: visões não atribuídas, minhas, em análise, escaladas e histórico; ações respeitam permissões e segregação.

- [ ] **Step 1: RED** para tabs/filtros, claim, redistribuição, resolução, justificativa obrigatória, `corrected` exigindo vínculo e autovalidação bloqueada.
- [ ] **Step 2: implementar métodos de comando** sem service-role e com tratamento explícito de conflito/permissão/not-found.
- [ ] **Step 3: implementar UI mínima**; desabilitar ação antecipadamente quando conhecida, mas depender do banco para segurança real.
- [ ] **Step 4: testes + typecheck + build**.
- [ ] **Step 5: commit** `feat(audit): add exception queue`.

### Task 8: Visualização da Cadeia de Custódia

**Files:**
- Create: `apps/web/src/features/audit/audit-chain.tsx`
- Create: `apps/web/src/features/audit/audit-chain.test.tsx`
- Modify: páginas de detalhe somente para links de entrada/saída necessários.

**Interfaces:**
- Consumes: `getCustodyChain`.
- Produces: navegação bidirecional origem → destinos e destino → origens, incluindo splits, merges e consumo parcial.

- [ ] **Step 1: RED** para cadeia linear, split, merge, consumo parcial, múltiplas origens, vazio e erro.
- [ ] **Step 2: implementar read model recursivo/relacional com limite defensivo** suficiente para impedir loop mesmo se dados corrompidos; banco continua impedindo ciclos.
- [ ] **Step 3: implementar UI navegável** sem exigir biblioteca gráfica nova no M1; priorizar clareza textual/árvore.
- [ ] **Step 4: provar drill-down nos dois sentidos com testes**.
- [ ] **Step 5: testes + typecheck + build**.
- [ ] **Step 6: commit** `feat(traceability): add bidirectional custody chain`.

### Task 9: Cenário ponta a ponta e regressão

**Files:**
- Modify: testes de banco/web pertinentes; criar fixture/teste E2E somente no padrão já existente no repo.

**Interfaces:**
- Prova final: `destinação ← venda ← estoque/lotes ← recebimentos ← pesagens ← documentos/evidências ← origem` e caminho inverso, com divergência/correção/validação.

- [ ] **Step 1: escrever cenário RED de integração** com dados persistentes de teste, sem mockar a cadeia de domínio.
- [ ] **Step 2: executar e corrigir somente gaps reais encontrados**, sempre com teste RED antes da correção.
- [ ] **Step 3: executar suíte completa de banco**.
- [ ] **Step 4: executar suíte web completa**.
- [ ] **Step 5: executar typecheck**.
- [ ] **Step 6: executar build de produção**.
- [ ] **Step 7: verificar regressão do Documents Center, recebimentos, vendas e stock ledger**.
- [ ] **Step 8: commit** `test(audit): verify M1 custody chain end to end`.

### Task 10: Revisão e PR empilhado

**Files:** nenhum código novo salvo se não houver defeito comprovado.

- [ ] **Step 1: revisar diff contra `feat/m1-documents-center`** e remover qualquer alteração não relacionada.
- [ ] **Step 2: confirmar que PR #6 continua aberto, não modificado e não merged**.
- [ ] **Step 3: verificar que a branch de Auditoria contém spec + plan + implementação, sem segredos**.
- [ ] **Step 4: rodar novamente os comandos de verificação exigidos pelo CI e registrar evidência fresca**.
- [ ] **Step 5: abrir PR de `feat/m1-audit-traceability` para `feat/m1-documents-center`**, nunca para `main` enquanto a pilha permanecer aberta.
- [ ] **Step 6: não fazer merge; aguardar CI/review**.

## Self-review do plano

- Cobertura da spec: Event Ledger, lotes, genealogia, exceções, segregação, RLS, timeline, Centro de Auditoria, cadeia bidirecional, concorrência e regressão estão mapeados.
- Sem placeholders de implementação deliberados; detalhes que dependem do padrão existente devem ser resolvidos pela leitura do repo antes de cada alteração, sem inventar uma arquitetura paralela.
- Interfaces entre tasks usam os mesmos nomes: `listAuditEvents`, `getSubjectTimeline`, `listAuditExceptions`, `getCustodyChain`.
- Escopo permanece M1; IA, blockchain, QR obrigatório e geração documental formal continuam fora.
