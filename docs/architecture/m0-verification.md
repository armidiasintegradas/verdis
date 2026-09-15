# M0 — Verificação de Rastreabilidade

## Objetivo

Este documento define a prova técnica da M0 — Verdis Core Foundation. O cenário automatizado principal está em `supabase/tests/database/0010_end_to_end_core.test.sql` e usa os dados determinísticos de `supabase/seed.sql`.

O cenário representa uma cadeia fisicamente coerente:

```text
Empresa Demo recebe 120 kg de papelão
→ Empresa Demo envia 120 kg
→ Cooperativa Demo recebe 120 kg
→ ticket original é associado ao recebimento
→ extração documental interpreta o ticket
→ validação humana aceita a evidência
→ saída e entrada são conciliadas
→ Cooperativa vende 50 kg
→ estoque final da Cooperativa = 70 kg
```

Nenhum passo cria massa artificialmente. Estoque é consequência de `stock_ledger_entries`, e a venda usa a mesma movimentação operacional que reduz o estoque.

## Comandos de verificação local

```bash
supabase start
supabase db reset
supabase test db
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Para encerrar o ambiente local:

```bash
supabase stop --no-backup
```

## As dez perguntas do MVP

### 1. Quanto foi movimentado?

Fonte primária: `public.movements.quantity_kg`.

A quantidade operacional nunca é derivada de um dashboard. Para efeitos de estoque, a consequência fica registrada em `public.stock_ledger_entries.delta_kg`.

### 2. Quem registrou?

Fonte: `public.movements.created_by`, ligado a `auth.users` e `public.user_profiles`.

A criação também produz `public.audit_events` com `action = 'movement.created'`.

### 3. Qual documento comprova?

Cadeia:

```text
movements
→ evidences
→ documents
```

`public.documents` preserva metadados do original, incluindo `sha256`, `storage_bucket` e `storage_path`. O arquivo fica no bucket privado `evidence-documents`.

### 4. Existe divergência?

Pesagem: `public.weighings` contém bruto, tara, líquido e peso declarado.

Entre contrapartes: `public.reconciliations.quantity_difference_kg` e `match_score` registram o resultado do casamento de movimentos independentes.

### 5. Quem enviou e quem recebeu?

Fonte: `public.movements.source_*` e `destination_*`.

Quando a outra parte ainda não participa da Verdis, `public.counterparties` preserva a referência externa; quando já participa, ela pode ser resolvida para uma `Organization` existente.

### 6. O balanço de massa fecha?

Fonte contábil: `public.stock_ledger_entries`.

Projeção atual: `public.current_stock`.

Regra básica:

```text
entradas - saídas ± ajustes/reversões = estoque calculado
```

Uma saída que produziria estoque negativo é rejeitada pelo banco, salvo a exceção auditável prevista para ajuste validamente auditado.

### 7. Qual é o nível de confiança/validação?

Fonte: `public.movements.evidence_level`.

Estados:

```text
AUTODECLARED
EVIDENCED
DOCUMENT_VERIFIED
VALIDATED
RECONCILED
TRACEABILITY_PROVEN
AUDITED
```

O nível é recalculado a partir de evidências, extrações, validações e reconciliações. `AUDITED` exige uma validação humana de auditoria; automação não pode produzir esse estado.

### 8. Quem validou ou auditou?

Fonte: `public.validations.actor_user_id`, `validation_type`, `automated`, `rule_code`, `reason` e `created_at`.

Validações automáticas e humanas são distinguíveis. Auditoria humana exige `automated = false` e ator identificado.

### 9. Quais indicadores foram afetados?

Na M0, indicadores finais ainda são deliberadamente uma projeção futura. A fonte rastreável já está pronta: `movements`, `stock_ledger_entries`, `sales`, `evidences`, `validations` e `reconciliations`.

Nenhum indicador futuro deverá armazenar uma verdade independente desses dados-fonte. O cálculo deve referenciar período, metodologia, fontes e evidências conforme o PRD.

### 10. É possível reconstruir a cadeia posteriormente?

Sim. A reconstrução usa:

```text
movements
+ documents/evidences/extractions
+ validations
+ reconciliations
+ stock_ledger_entries
+ sales
+ audit_events
```

`audit_events` e `stock_ledger_entries` são append-only para o fluxo da aplicação, e movimentos postados não podem ter campos de massa reescritos silenciosamente.

## Segurança e isolamento

O teste ponta a ponta também assume a identidade de `Empresa Demo` como role `authenticated` e verifica que ela não enxerga:

- a organização `Cooperativa Demo` sem membership correspondente;
- uma organização de outro tenant.

Isso demonstra que a segregação não depende apenas da interface. Ela é aplicada por RLS e helpers de autorização no banco.

## Critério de aprovação

A M0 não pode sair de draft enquanto, no mesmo estado de código:

```text
pnpm test        PASS
pnpm typecheck   PASS
pnpm build       PASS
supabase test db PASS
```

Além disso, todas as migrations devem ser reaplicáveis a partir de um banco limpo com `supabase db reset`.
