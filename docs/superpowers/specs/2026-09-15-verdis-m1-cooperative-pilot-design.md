# Verdis M1 — Cooperative Pilot Design

Data: 2026-09-15  
Status: desenho aprovado em conversa, aguardando revisão escrita antes do plano de implementação

## 1. Objetivo

Transformar a fundação técnica homologada na M0 em uma experiência operacional utilizável por uma cooperativa de reciclagem, sem transformar a primeira versão em um ERP completo.

A M1 deve provar que uma pessoa consegue executar a rotina essencial da cooperativa com baixa fricção enquanto a Verdis, em segundo plano, mantém estoque derivado, evidências, validações, rastreabilidade e auditoria.

A experiência deve materializar o princípio do produto:

> Um registro. Múltiplos resultados.

Fluxo central da M1:

`RECEBIMENTO → EVIDÊNCIA → CONFERÊNCIA → ESTOQUE → VENDA → DOCUMENTO → RASTREABILIDADE`

## 2. Escopo escolhido

A M1 adota o modelo de **piloto operacional**.

Inclui:

- home operacional da cooperativa;
- recebimentos;
- estoque;
- vendas;
- documentos/evidências;
- pendências operacionais;
- histórico/rastreabilidade da movimentação;
- integração com autenticação, escopo, RLS, Evidence Engine, stock ledger, sales e audit trail da M0.

Ficam fora desta milestone:

- financeiro completo;
- despesas e contas a pagar/receber;
- associados e presença;
- folha/rateio;
- equipamentos;
- frota completa;
- contratos avançados;
- PGRS/RGRS;
- MTR/CDF automatizado;
- indicadores ESG completos;
- água, energia, carbono, social e governança;
- dashboards executivos complexos.

Esses itens continuam previstos no produto, mas não são necessários para provar o piloto operacional.

## 3. Princípios de UX

A interface da cooperativa deve funcionar como ferramenta de trabalho, não como painel ESG.

Princípios obrigatórios:

1. ações principais sempre visíveis;
2. poucos campos por etapa;
3. linguagem operacional e não jurídica;
4. números grandes e legíveis;
5. alto contraste;
6. uso confortável em desktop, tablet e celular;
7. nenhum gráfico decorativo na home inicial;
8. evitar exigir que o usuário entenda conceitos internos como Evidence Engine, RLS ou stock ledger;
9. erros devem explicar o que aconteceu e como resolver;
10. documentos e IA devem reduzir digitação, não criar uma etapa extra de trabalho.

A marca oficial da Verdis deve ser aplicada sem redesenho ou alteração. O Stitch deve trabalhar com tokens e ativos oficiais quando disponíveis, nunca recriar a marca por IA.

## 4. Navegação da M1

Navegação principal:

`Início | Recebimentos | Estoque | Vendas | Documentos | Pendências`

A navegação deve ser simples o suficiente para um operador usar sem treinamento extenso.

No desktop/tablet, recomenda-se navegação lateral ou superior persistente, conforme o estudo visual aprovado no Stitch.

No mobile, as ações `Receber material` e `Registrar venda` devem permanecer acessíveis com no máximo um toque a partir da home.

## 5. Home da Cooperativa

Objetivo: responder rapidamente "o que eu preciso fazer agora?".

Estrutura funcional:

```text
COOPERATIVA

Bom dia, [nome]

[ + RECEBER MATERIAL ]
[ + REGISTRAR VENDA ]

HOJE
Recebido hoje
Vendido hoje
Estoque atual
Pendências

PENDÊNCIAS PRIORITÁRIAS
- divergências
- documentos ausentes
- documentos aguardando conferência

ESTOQUE EM ATENÇÃO
- materiais com maior saldo
- materiais com movimentação recente
```

Métricas são sempre derivadas dos dados canônicos.

`Recebido hoje` deve usar movimentos postados de recebimento no escopo ativo.

`Vendido hoje` deve usar vendas confirmadas vinculadas a movimentos postados.

`Estoque atual` deve usar `current_stock`/stock ledger, nunca um campo manual independente.

A home não deve introduzir uma segunda fonte de verdade.

## 6. Fluxo — Receber Material

### 6.1 Objetivo

Registrar uma entrada real, associar a origem e o material, permitir comprovação documental e atualizar o estoque somente após a confirmação/postagem da movimentação.

### 6.2 Etapas de interface

```text
1. DE ONDE VEIO?
   selecionar origem/contraparte

2. O QUE CHEGOU?
   material
   peso informado
   data/hora, preenchida automaticamente e editável quando permitido

3. COMPROVAR
   tirar foto do ticket
   ou enviar arquivo
   ou continuar sem documento

4. CONFERIR
   mostrar dados informados
   mostrar dados extraídos, quando disponíveis
   mostrar diferença de peso

5. CONFIRMAR RECEBIMENTO
```

### 6.3 Regra de persistência

O fluxo cria primeiro uma `Movement` em `draft` com `movement_type = receipt`.

Enquanto a movimentação estiver em `draft`, o usuário pode corrigir os campos permitidos pelo contrato existente.

Quando houver documento:

`arquivo → storage privado → documents → evidence → extraction → comparação`

Somente após a confirmação final a movimentação muda para `posted`.

A transição para `posted` produz o efeito de estoque já implementado na M0.

### 6.4 Operação sem documento

A falta de documento não deve impedir o trabalho operacional.

O usuário pode confirmar o recebimento sem evidência documental. Nesse caso:

- o movimento permanece com nível de evidência `AUTODECLARED`;
- o estoque é atualizado normalmente após a postagem;
- a home/central de pendências mostra `Sem documento`;
- o documento pode ser anexado posteriormente, conforme permissão.

Isso preserva a operação real sem apresentar dado autodeclarado como comprovado.

### 6.5 Divergência de peso

Quando a extração documental produzir peso diferente do informado, a UI deve exibir:

```text
Peso informado:   520 kg
Peso do ticket:   482 kg
Diferença:         38 kg
```

A M1 não define tolerância automática arbitrária.

Qualquer divergência deve ser visível e confirmada pelo usuário.

Antes da postagem, o usuário pode:

- usar o peso documental; ou
- manter o peso informado.

Se mantiver o peso informado diante de divergência, deve registrar uma justificativa operacional curta. A implementação deve preservar a comparação entre valor declarado e valor evidenciado.

Movimentações já `posted` não podem ter campos que afetam massa reescritos silenciosamente; correções posteriores seguem o modelo de reversão/ajuste auditável da M0.

## 7. Fluxo — Recebimento concluído

Após a postagem, a tela de sucesso deve mostrar somente o que ajuda a confirmar a operação:

```text
RECEBIMENTO REGISTRADO

Material
Quantidade
Origem
Data/hora
Nível de comprovação
Saldo atualizado do material

[Ver movimentação]
[Receber outro material]
```

O usuário não precisa ver nomes internos de tabelas ou regras.

## 8. Estoque

### 8.1 Regra principal

O estoque da M1 continua sendo projeção do ledger homologado na M0.

Nenhuma tela pode oferecer edição direta de `saldo atual`.

### 8.2 Tela de estoque

Deve mostrar:

- saldo total;
- saldo por material;
- última movimentação;
- filtros simples por material/unidade;
- indicação visual de saldo zero ou baixo quando fizer sentido operacional.

Exemplo:

```text
ESTOQUE

18.420 kg

Papelão       8.420 kg
PET            3.200 kg
PEAD           2.100 kg
Alumínio         780 kg
```

### 8.3 Detalhe do material

Ao abrir um material:

- saldo atual;
- entradas;
- saídas;
- últimas movimentações;
- documentos vinculados;
- origem/destino;
- linha temporal simples.

O detalhe deve permitir reconstruir de onde veio o saldo sem criar um cálculo paralelo ao banco.

## 9. Fluxo — Registrar Venda

### 9.1 Etapas

```text
1. MATERIAL
2. QUANTIDADE
3. COMPRADOR
4. PREÇO POR KG
5. DOCUMENTO / NF, opcional no momento do registro
6. CONFERIR
7. CONFIRMAR VENDA
```

### 9.2 Prévia obrigatória

Antes da confirmação:

```text
Disponível
Quantidade da venda
Saldo estimado após venda
Preço/kg
Valor total
```

O valor total deve derivar de `quantidade × preço/kg` e não ser digitado como verdade independente.

### 9.3 Persistência

A venda deve reutilizar os contratos da M0:

- `Movement` com `movement_type = sale`;
- registro em `sales` ligado à mesma movimentação;
- comprador via `counterparty`;
- documento fiscal opcional via `documents`;
- postagem da movimentação para gerar a saída do `stock_ledger_entries`;
- `audit_events` conforme regras existentes.

A UI nunca reduz estoque manualmente.

### 9.4 Estoque insuficiente

Se a quantidade solicitada superar o saldo disponível, a venda não pode ser postada.

Mensagem de interface:

```text
Saldo insuficiente
Disponível: 320 kg
Venda informada: 400 kg
Ajuste a quantidade para continuar.
```

Não remover ou contornar a constraint/regra de estoque do banco.

### 9.5 Venda sem documento

A venda pode ser registrada sem documento fiscal no momento operacional se a política do escopo permitir, mas deve gerar uma pendência documental visível.

O sistema não deve representar essa venda como documentalmente validada até a evidência correspondente existir e cumprir as regras de validação.

## 10. Documentos

A tela `Documentos` é operacional, não um GED completo.

Deve mostrar:

- tipo;
- nome/identificador;
- data;
- movimentação vinculada;
- status de extração/revisão;
- nível de confiança quando útil;
- duplicidade/suspeita quando existente;
- acesso ao arquivo original conforme permissão.

O arquivo original permanece imutável e no bucket privado da M0.

A extração nunca substitui o original.

## 11. Pendências

### 11.1 Objetivo

Transformar inconsistências em ações simples e visíveis.

A M1 não cria um sistema genérico de tickets/incidentes. As pendências iniciais são derivadas dos estados canônicos já existentes.

Tipos iniciais:

- recebimento sem documento;
- venda sem documento;
- documento aguardando extração;
- documento aguardando confirmação/revisão;
- divergência de peso;
- validação rejeitada;
- evidência incompleta;
- duplicidade documental detectada, quando existente.

### 11.2 Implementação conceitual

A primeira versão deve preferir uma consulta/view/service de projeção de pendências sobre `movements`, `documents`, `evidences`, `document_extractions`, `validations`, `weighings` e `sales`.

Não criar uma tabela genérica `issues` apenas para espelhar estados que já existem.

Uma tabela própria só será introduzida se a milestone exigir ciclo de vida independente como atribuição, SLA, comentários ou resolução manual que não possa ser inferida das entidades existentes.

### 11.3 Tela de pendências

Cada item deve responder:

- o que aconteceu;
- qual registro está afetado;
- qual ação resolve;
- qual impacto existe na comprovação.

Exemplo:

```text
Divergência de peso
Recebimento #1284
Informado: 520 kg
Ticket: 482 kg
[Abrir e conferir]
```

## 12. Histórico e rastreabilidade

A tela de detalhe de uma movimentação deve reunir, em uma única narrativa:

- tipo e código da movimentação;
- material;
- quantidade;
- origem/destino;
- usuário que registrou;
- data do fato;
- pesagem;
- documentos;
- extrações;
- validações;
- nível de evidência;
- reflexo no estoque;
- venda relacionada, quando aplicável;
- eventos relevantes de auditoria.

Objetivo: um gestor autorizado deve reconstruir a operação sem consultar diretamente tabelas técnicas.

## 13. Uso de IA documental na M1

A M1 deve tratar extração como processo assíncrono.

Estado de UX esperado:

```text
upload concluído
→ documento preservado
→ extração em processamento
→ dados disponíveis
→ conferência humana quando necessária
```

A tela não deve ficar bloqueada indefinidamente esperando a IA.

Se a extração falhar:

- o documento original continua válido como arquivo de evidência;
- o status deve indicar falha de interpretação;
- o usuário pode confirmar os dados manualmente, conforme permissão;
- a falha não pode apagar o documento nem inventar campos.

Regra permanente:

> IA interpreta. O documento comprova.

## 14. Estados de carregamento, erro e recuperação

Toda ação crítica deve possuir estados explícitos:

- carregando;
- salvando rascunho;
- enviando documento;
- processando documento;
- falha de upload;
- falha de extração;
- falta de permissão;
- estoque insuficiente;
- registro alterado/conflito;
- concluído.

A interface nunca deve mostrar sucesso antes da confirmação real do backend.

Uploads devem permitir nova tentativa sem criar duplicatas silenciosas.

Erros de RLS ou permissão devem ser apresentados como falta de autorização, nunca resolvidos relaxando políticas do banco.

## 15. Arquitetura de frontend

A M1 deve seguir a estrutura existente e adicionar features isoladas.

Direção conceitual:

```text
apps/web/src/
  app/
  features/
    cooperative-home/
    receipts/
    stock/
    sales/
    documents/
    pendings/
    movement-detail/
  services/
    cooperative/
    movements/
    documents/
    evidence/
    stock/
    sales/
```

Cada feature deve depender de services/contratos claros, evitando acesso Supabase espalhado em componentes de apresentação.

Componentes visuais reutilizáveis podem ser extraídos conforme repetição real surgir. A M1 não deve iniciar um design system excessivamente abstrato antes de existirem padrões aprovados no Stitch.

## 16. Contrato com a M0

A M1 deve reutilizar, e não duplicar:

- `tenants`;
- `organizations`;
- `units`;
- `memberships`;
- RLS e permissions;
- `materials`;
- `counterparties`;
- `movements`;
- `weighings`;
- `documents`;
- bucket `evidence-documents`;
- `document_extractions`;
- `evidences`;
- `validations`;
- `reconciliations`;
- `stock_ledger_entries`;
- `current_stock`;
- `sales`;
- `audit_events`.

Mudanças de banco na M1 devem ser aditivas e justificadas por requisitos que o Core atual realmente não suporta.

## 17. Segurança e autorização

A interface deve respeitar o escopo ativo fornecido pelo mecanismo existente.

Regras:

- nunca aceitar `tenant_id`, `organization_id`, `unit_id` ou `created_by` arbitrários vindos do formulário;
- derivar campos de segurança do contexto autenticado;
- não usar service-role no frontend;
- não expor documentos de outra organização;
- manter RLS como controle final;
- manter o hardening da M0;
- não reintroduzir exclusão direta de arquivo original de evidência.

## 18. Responsividade e acessibilidade

A M1 deve ser projetada no Stitch para três classes de viewport:

- desktop;
- tablet;
- mobile.

Requisitos mínimos:

- alvos de toque confortáveis;
- labels explícitos;
- foco visível;
- navegação por teclado nos fluxos de desktop;
- contraste adequado;
- feedback textual além de cor;
- números e unidades apresentados juntos;
- não depender de hover para ações essenciais.

O mobile deve privilegiar captura rápida de recebimento/documento, sem esconder informações necessárias para conferência.

## 19. Brief oficial para o Stitch

O Stitch deve explorar e entregar as seguintes telas/estados, mantendo uma linguagem visual única:

1. Home Cooperativa — desktop;
2. Home Cooperativa — mobile;
3. Receber Material — origem e material;
4. Receber Material — captura/upload de documento;
5. Conferência — declarado versus extraído;
6. Recebimento concluído;
7. Estoque — visão geral;
8. Detalhe do material;
9. Registrar Venda — formulário e prévia;
10. Venda concluída;
11. Pendências — lista;
12. Pendência — detalhe/ação;
13. Documentos — lista;
14. Movimentação — detalhe/rastreabilidade;
15. estados de carregamento, vazio, erro, sem permissão e processamento de documento.

### Direção visual

- aparência profissional, clara e humana;
- operação como prioridade visual;
- botões principais grandes;
- tipografia altamente legível;
- hierarquia forte entre ação, número e explicação;
- cards apenas quando ajudam agrupamento operacional;
- evitar excesso de sombras, gradientes ou efeitos decorativos;
- evitar estética de dashboard financeiro/BI;
- permitir leitura em ambiente operacional;
- usar a identidade oficial da Verdis sem reinterpretar a marca.

### Conteúdo de exemplo para protótipo

Usar dados fictícios claramente de demonstração, como:

- Cooperativa Demo;
- Papelão;
- PET;
- PEAD;
- 480 kg;
- 520 kg versus 482 kg;
- estoque de 18.420 kg;
- venda de 1.000 kg de PET a R$ 3,10/kg.

Esses números são apenas conteúdo de protótipo e não constituem métricas reais da Verdis.

## 20. Limites do Antigravity

O Antigravity implementará o design aprovado, mas não deve:

- redesenhar silenciosamente os fluxos aprovados;
- criar novas entidades de domínio sem atualizar a spec;
- remover RLS/constraints para fazer a UI funcionar;
- criar um segundo cálculo de estoque no frontend;
- transformar estados de evidência em simples badges sem regra real;
- inventar integrações legais/fiscais que não estejam implementadas;
- alterar a marca oficial;
- ampliar a M1 para financeiro, associados ou ESG completo.

A ordem de autoridade para implementação será:

`PRD → Core Foundation Design → M1 Cooperative Pilot Design → migrations/tests → Stitch aprovado → plano/issue → código`

## 21. Testes e critérios de aceite

### 21.1 Fluxo de recebimento

Deve existir teste cobrindo:

`criar draft → anexar ou não documento → conferir → postar → stock ledger + entrada → home/estoque atualizados`.

### 21.2 Fluxo de venda

Deve existir teste cobrindo:

`selecionar material → verificar saldo → criar sale draft → registrar venda → postar → saída do ledger → novo saldo`.

### 21.3 Segurança

Deve continuar provado que:

- usuário não acessa outra organização sem membership;
- usuário não consegue fabricar outro `created_by`;
- documento privado não vaza por caminho manipulado;
- estoque não pode ser alterado por payload de frontend;
- RLS permanece ativo.

### 21.4 Evidência

Deve existir cobertura para:

- recebimento sem documento = autodeclarado + pendência;
- documento anexado = evidenciado;
- extração concluída = verificado documentalmente quando as regras existentes forem cumpridas;
- falha de extração não remove documento;
- divergência permanece visível até ação adequada.

### 21.5 UI

Testes de frontend devem cobrir pelo menos:

- ações principais visíveis na home;
- fluxo de recebimento;
- fluxo de venda;
- estoque insuficiente;
- estado de upload/processamento;
- lista de pendências;
- bloqueio/feedback de permissão.

## 22. Cenário de homologação da M1

A milestone só pode ser considerada pronta quando um usuário de cooperativa autorizado conseguir executar o seguinte caminho de ponta a ponta:

```text
LOGIN
→ RECEBER 480 KG DE PAPELÃO
→ INFORMAR ORIGEM
→ FOTOGRAFAR/ANEXAR TICKET
→ VER EXTRAÇÃO
→ CONFERIR PESO
→ CONFIRMAR RECEBIMENTO
→ VER +480 KG NO ESTOQUE
→ REGISTRAR VENDA DE 200 KG
→ SELECIONAR COMPRADOR
→ INFORMAR PREÇO/KG
→ ANEXAR DOCUMENTO OU GERAR PENDÊNCIA
→ CONFIRMAR VENDA
→ VER 280 KG RESTANTES
→ ABRIR A MOVIMENTAÇÃO
→ RECONSTRUIR DOCUMENTO, EVIDÊNCIA, ESTOQUE E AUDITORIA
```

A mesma execução deve produzir dados consistentes no backend sem edição manual de saldo.

## 23. Definition of Done da M1

A M1 somente pode sair de draft quando:

```text
unit tests            PASS
typecheck             PASS
build                 PASS
database tests        PASS, quando houver migration
security regression   PASS
fluxo E2E do piloto   PASS
```

Além disso:

- telas aprovadas no Stitch devem estar implementadas de forma funcional;
- não pode existir dado mock em caminho de produção;
- nenhum segredo pode estar no frontend;
- `main` deve permanecer verde após merge;
- PR deve documentar alterações de contrato, caso existam.

## 24. Decisão congelada para o próximo passo

O próximo artefato, após a revisão desta especificação, será o **plano técnico de implementação da M1**.

Esse plano deverá decompor a milestone em tarefas TDD e indicar exatamente:

- arquivos e features a criar;
- serviços e queries;
- eventuais migrations aditivas;
- testes unitários;
- testes pgTAP;
- testes de interface;
- sequência de integração com o Stitch;
- prompts versionados para o Antigravity;
- gates de CI e PR.
