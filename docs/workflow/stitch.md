# Verdis — Fluxo de Trabalho no Stitch

## Papel do Stitch

Stitch é o ambiente de exploração, comparação e validação das interfaces do produto. Ele ajuda a transformar fluxos já definidos em experiências claras para Cooperativas, Empresas, Eventos, Gestão Pública e Central Verdis.

Stitch não redefine o domínio.

## Autoridade por assunto

### GitHub é autoritativo para

- entidades e relacionamentos;
- regras de movimentação;
- estados do Evidence Engine;
- permissões e RLS;
- regras de estoque e balanço de massa;
- imutabilidade e auditoria;
- critérios de aceite;
- nomenclatura funcional aprovada no PRD.

### Stitch pode explorar

- hierarquia visual;
- arquitetura de informação;
- navegação;
- composição de telas;
- responsividade;
- padrões de formulário;
- feedback de estado;
- visualização de evidências e rastreabilidade;
- dashboards adequados a cada público.

## Fluxo para uma nova interface

```text
PRD / regra aprovada no GitHub
→ fluxo funcional
→ wireframe / alternativas no Stitch
→ escolha e refinamento
→ registro da decisão no GitHub
→ implementação no Antigravity
→ teste/homologação
```

## Regra central de UX

> O usuário não deve trabalhar para alimentar a plataforma. A plataforma deve transformar o trabalho que ele já realiza em informação confiável.

Consequências práticas:

- reduzir digitação quando um documento já contém o dado;
- priorizar ações operacionais simples no mobile;
- esconder complexidade ESG da rotina da cooperativa quando não for necessária;
- mostrar performance à diretoria em vez de listas técnicas de documentos;
- permitir abrir o dado executivo até a evidência que o sustenta.

## M0

A M0 não requer design final no Stitch. O `Core Inspector` é propositalmente utilitário e existe apenas para provar o núcleo técnico.

O primeiro uso intensivo do Stitch ocorrerá na experiência de Cooperativas, depois que Core, autenticação, escopo, movimentos, documentos e evidências estiverem homologados.
