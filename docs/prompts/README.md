# Verdis — Prompts Versionados

Este diretório guarda somente prompts que fazem parte de um processo de implementação reproduzível no Antigravity ou de exploração controlada no Stitch.

## O que deve ser versionado

- prompts que definem uma etapa de implementação técnica;
- prompts de handoff de uma interface já aprovada;
- prompts que estabelecem restrições críticas de domínio, segurança ou dados;
- prompts reutilizáveis para auditoria, testes ou geração de artefatos do projeto.

## O que não deve ser versionado

- conversas exploratórias descartáveis;
- segredos, tokens, chaves ou dados pessoais;
- instruções que contradigam PRD, Domain Model, migrations ou testes;
- prompts que tentem substituir regras de autorização por comportamento de interface.

## Cabeçalho recomendado

```markdown
# [Nome do prompt]

Contexto: [milestone / issue / tela]
Fonte de verdade: [links/caminhos para PRD, spec e arquivos]
Objetivo: [resultado esperado]
Não alterar: [invariantes]
Critério de aceite: [como verificar]
```

## Princípio

Prompt não é especificação implícita. Se uma decisão material surgir durante uma execução, ela deve voltar para a documentação/testes do GitHub antes de se tornar parte permanente do produto.
