# Verdis — Fluxo de Trabalho no Antigravity

## Papel do Antigravity

O Antigravity é o ambiente de implementação e integração da Verdis. Ele não é a fonte da verdade do produto. Regras de domínio, decisões arquiteturais, contratos de banco e critérios de aceite vivem no GitHub.

## Antes de editar

Para qualquer tarefa relevante, ler nesta ordem:

1. `docs/product/PRD.md`;
2. `docs/superpowers/specs/2026-09-15-verdis-core-foundation-design.md` quando a tarefa tocar o Core;
3. `docs/architecture/domain-model.md`;
4. o plano/issue específico da tarefa;
5. migrations e testes já existentes no domínio afetado.

## Regras obrigatórias

1. Trabalhar em uma tarefa/issue por vez.
2. Nunca alterar contratos de banco apenas para fazer uma interface “caber”. Se o contrato precisar mudar, atualizar primeiro a especificação e os testes.
3. Seguir TDD para regras de domínio: teste que falha → implementação mínima → teste verde → refatoração necessária.
4. Nunca remover RLS, validação, constraint, audit trail ou imutabilidade para contornar um erro de frontend.
5. Nunca colocar service-role key, senha, token privado ou segredo no frontend, commit ou prompt versionado.
6. O cliente web usa apenas URL pública do Supabase e publishable key.
7. Migrations são somente aditivas durante desenvolvimento compartilhado; não reescrever migration já publicada em ambiente compartilhado sem decisão explícita.
8. O documento original de evidência é preservado. Extração/IA é dado derivado.
9. `VALIDATED` e `AUDITED` não são sinônimos. Automação/IA nunca produz `AUDITED`.
10. Estoque não é editado como número independente; ele deriva do ledger e de movimentos válidos.
11. Antes de declarar uma tarefa concluída, executar os testes definidos na issue/plano e registrar o resultado.
12. Mudanças que alterem implementação de forma material devem gerar documentação/prompt versionado em `docs/prompts/` quando o prompt fizer parte do processo reproduzível.

## Fluxo Git

```text
issue / tarefa aprovada
→ branch feature/*
→ implementar com testes
→ push
→ CI
→ Pull Request
→ revisão
→ homologação
→ merge
```

`main` representa código homologado. Trabalho incompleto permanece em branch/PR draft.

## Regra de escopo

O Antigravity pode sugerir melhoria, mas não deve ampliar silenciosamente o escopo da milestone. Para a M0, dashboards finais, design system completo, Compliance, PGRS/RGRS, carbono, água, Social e Governança estão fora de escopo.

## Definition of Done mínima

Uma mudança só pode ser proposta como pronta quando:

```text
unit tests     PASS
typecheck      PASS
build          PASS
database tests PASS, quando o banco for afetado
```

E quando a implementação continua consistente com PRD, Domain Model e RLS.
