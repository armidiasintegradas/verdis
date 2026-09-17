# Verdis — Auditoria & Rastreabilidade M1

Data: 2026-09-16
Status: design aprovado em conversa; aguardando revisão formal antes do plano de implementação
Base: `feat/m1-documents-center`
Branch: `feat/m1-audit-traceability`

## 1. Objetivo

Construir uma camada probatória e navegável de auditoria e rastreabilidade sobre as fundações persistentes já existentes no Verdis. O M1 deve permitir reconstruir, nos dois sentidos, a cadeia entre origem/coleta, recebimento, pesagem, classificação, documentos/evidências, estoque, lotes, movimentações, venda/destinação, correções e validações humanas.

A implementação deve preservar `audit_events` como histórico imutável e `stock_ledger_entries` como ledger quantitativo de estoque. Não será criada uma segunda fonte de verdade concorrente.

## 2. Princípios aprovados

1. Trilha completa e imutável.
2. Correções são novos eventos; fatos anteriores nunca são sobrescritos silenciosamente.
3. Segregação de funções para ações críticas: autor/corretor não valida a própria ação quando validação independente for exigida.
4. UX híbrida: timeline contextual + Centro de Auditoria transversal.
5. Evento probatório completo: autoria, momento, entidade, antes/depois, justificativa, evidências, origem, encadeamento, contexto organizacional e decisão de validação quando aplicável.
6. Fila de exceções operacional, sem apagar o histórico probatório.
7. Responsabilidade híbrida: exceção nasce na fila do escopo e pode ser assumida/redistribuída.
8. Resolução estruturada: Confirmado, Corrigido, Justificado, Rejeitado ou Escalado.
9. Cadeia de Custódia Digital ponta a ponta.
10. Lotes digitais com genealogia para divisão, consolidação e consumo parcial.

## 3. Escopo M1

Incluído:
- enriquecimento compatível do Event Ledger;
- relações explícitas entre eventos e evidências;
- lotes digitais e genealogia;
- consumo parcial, divisão e consolidação rastreáveis;
- fila de exceções;
- atribuição e redistribuição;
- resolução estruturada;
- segregação de funções no backend/banco;
- timeline probatória por entidade;
- Centro de Auditoria com filtros e investigação;
- navegação bidirecional origem → destino e destino → origem;
- RLS e testes de isolamento/autorização;
- testes de integridade e invariantes de quantidade.

Fora do M1:
- QR Code físico obrigatório em toda unidade logística;
- scoring automático de risco;
- IA para decisão de auditoria;
- PDF obrigatório por ocorrência;
- telemetria forense extensa como IP/user-agent;
- blockchain ou infraestrutura criptográfica distribuída.

## 4. Arquitetura

Quatro camadas lógicas:

`Event Ledger imutável → Cadeia de Custódia → Fila de Exceções → Read Models/UI`

### 4.1 Event Ledger

`public.audit_events` permanece como registro histórico append-only. A evolução deve ser aditiva e compatível com os eventos existentes. Novos eventos devem suportar correlação/causalidade, justificativa e metadados probatórios sem converter `technical_context` em depósito sem contrato.

Famílias de eventos previstas:
- `movement.created`, `movement.posted`, `movement.voided`;
- `document.created`, `evidence.created`;
- `validation.created`, `validation.approved`, `validation.rejected`;
- `correction.requested`, `correction.applied`;
- `exception.opened`, `exception.assigned`, `exception.reassigned`, `exception.resolved`, `exception.rejected`, `exception.escalated`;
- `lot.created`, `lot.split`, `lot.merged`, `lot.consumed`.

Eventos existentes não serão renomeados retroativamente.

### 4.2 Ledger de estoque

`public.stock_ledger_entries` continua responsável pelo saldo quantitativo. A rastreabilidade de lotes não deve introduzir um cálculo paralelo de estoque que possa divergir do ledger existente. Operações de lote devem reconciliar suas quantidades com os efeitos de movimentos persistidos.

### 4.3 Lotes digitais

Entidades conceituais:
- `custody_lots`: identidade, escopo, material, quantidade originada, estado e vínculo de origem;
- `custody_lot_links`: arestas genealógicas entre lotes, com tipo de relação e quantidade atribuída;
- vínculos explícitos entre lote e movimento quando necessários para provar origem/consumo.

Invariantes:
- quantidade não pode ser negativa;
- consumo acumulado não pode superar disponibilidade;
- split preserva soma das quantidades;
- merge preserva soma das contribuições;
- genealogia não pode formar ciclos;
- material e escopo precisam ser compatíveis com a operação;
- correção não reescreve genealogia passada: produz nova relação/evento compensatório conforme o caso.

### 4.4 Exceções

`audit_exceptions` representa o estado operacional atual da ocorrência. O histórico de mudanças desse estado é sempre emitido no Event Ledger.

Estados operacionais mínimos:
- `open`;
- `in_review`;
- `resolved`;
- `rejected`;
- `escalated`.

Resultados estruturados de resolução:
- `confirmed`;
- `corrected`;
- `justified`;
- `rejected`;
- `escalated`.

Uma exceção pode nascer sem responsável. Usuário autorizado pode assumir; gestor autorizado pode redistribuir. Toda atribuição, redistribuição e resolução é auditável.

## 5. Segregação de funções

Permissões conceituais, ajustadas aos padrões existentes do repositório durante o plano:
- `audit.read`;
- `audit.review`;
- `audit.assign`;
- `audit.resolve`;
- `audit.manage`;
- `traceability.read`;
- `traceability.operate`.

A restrição de autovalidação deve ser aplicada no backend/banco para ações críticas. A UI pode antecipar a restrição, mas não é barreira de segurança.

A autorização deve respeitar tenant, organização e unidade sempre que a entidade possuir escopo de unidade. Nenhuma operação privilegiada dependerá de service-role no frontend.

## 6. Evidência probatória

Cada acontecimento relevante deve permitir reconstruir, quando aplicável:
- ator;
- data/hora;
- ação;
- entidade e identificador;
- estado anterior e novo estado;
- justificativa;
- evento causador/anterior;
- documentos/evidências considerados;
- organização/unidade;
- validador e decisão independente.

Documentos continuam privados. O acesso ao original deve reutilizar o mecanismo autenticado de URL assinada já adotado pelo Documents Center; nenhum requisito deste M1 torna bucket público ou cria URL permanente.

## 7. Cadeia de Custódia

Fluxo conceitual:

`origem/coleta → recebimento → pesagem → classificação → documentos/evidências → lote → estoque → divisão/consolidação/transferência → venda/destinação → validação`

A navegação deve funcionar nos dois sentidos. Uma venda deve permitir chegar aos lotes e fatos de origem; uma entrada deve permitir chegar às destinações que consumiram seu material.

O modelo deve aceitar consumo parcial. Exemplo: lote de 500 kg pode ter 300 kg consumidos por uma venda e manter 200 kg disponíveis sem perder identidade ou origem.

## 8. Read Models e UI

### 8.1 Timeline contextual

Recebimentos, vendas, documentos e lotes devem poder exibir uma timeline cronológica probatória. Cada item mostra resumo suficiente para leitura e permite inspecionar detalhes: ator, horário, antes/depois, justificativa, evidências e relações.

A timeline é somente leitura do histórico. Ações operacionais de exceção usam comandos explícitos e nunca editam eventos anteriores.

### 8.2 Centro de Auditoria

Visão transversal com filtros para, no mínimo:
- período;
- organização;
- unidade;
- tipo de evento;
- material;
- usuário;
- lote;
- recebimento/venda/documento;
- estado da exceção;
- responsável.

O resultado deve permitir drill-down até a entidade e evento de origem. M1 não exige busca full-text, realtime, paginação sofisticada ou scoring de risco se os volumes atuais não justificarem esses mecanismos.

### 8.3 Fila de Exceções

A UI deve separar claramente:
- não atribuídas;
- atribuídas ao usuário;
- em análise;
- escaladas;
- concluídas quando o filtro histórico for solicitado.

A resolução exige resultado estruturado e justificativa. Quando `corrected`, exige vínculo com o evento corretivo correspondente.

## 9. Fluxos críticos

### 9.1 Correção

1. Usuário solicita correção com motivo.
2. Sistema registra `correction.requested`.
3. Correção autorizada cria novo fato/estado e `correction.applied`.
4. Se validação independente for exigida, autor da correção não pode validá-la.
5. Validação produz novo evento.
6. Estado vigente é projetado a partir dos fatos; o histórico anterior permanece acessível.

### 9.2 Divergência

1. Divergência detectada por regra/processo existente.
2. Exceção é aberta no escopo correto.
3. Auditor assume ou gestor atribui.
4. Evidências são analisadas.
5. Resolução estruturada é registrada.
6. Eventual correção é vinculada.
7. Event Ledger preserva toda a sequência.

### 9.3 Split/Merge

Split cria descendentes cuja soma atribuída não excede a disponibilidade do lote pai. Merge cria lote descendente com múltiplos pais e registra a contribuição de cada um. As operações devem ser transacionais para impedir genealogia parcial.

## 10. Erros e concorrência

- invariantes críticas devem ser protegidas no banco/transação, não somente na UI;
- comandos concorrentes de consumo/atribuição devem falhar de forma determinística quando a pré-condição deixou de ser verdadeira;
- nenhum erro intermediário pode deixar aresta genealógica sem evento correspondente ou quantidade parcialmente consumida;
- mensagens da UI devem distinguir conflito de concorrência, falta de permissão, entidade inexistente e falha inesperada;
- retries automáticos não devem duplicar eventos ou consumos; comandos críticos precisam de idempotência compatível com os padrões existentes.

## 11. Segurança e RLS

Todas as novas tabelas públicas devem ter RLS habilitada antes de exposição à aplicação. Políticas devem reutilizar `app_private.has_permission` e seguir o escopo real da entidade.

Testes de banco devem provar, no mínimo:
- leitura permitida no escopo correto;
- negação cross-tenant;
- negação cross-organization;
- restrição por unidade quando aplicável;
- impossibilidade de update/delete de fatos imutáveis;
- autovalidação crítica recusada;
- usuário sem permissão não resolve/atribui exceção.

## 12. Estratégia de testes

TDD será obrigatório durante implementação.

Banco/pgTAP:
- migrations/tabelas/policies;
- append-only;
- RLS;
- segregação;
- invariantes de lote;
- split/merge/consumo;
- resolução e atribuição;
- idempotência/repetição de comandos críticos.

Aplicação:
- read models retornam apenas escopo ativo;
- timeline ordena e relaciona eventos corretamente;
- Centro de Auditoria filtra sem fabricar dados;
- estados vazios, loading, erro e not-found;
- ações indisponíveis por permissão/autoria;
- navegação bidirecional da cadeia;
- resolução exige os campos previstos.

Regressão:
- Documents Center continua funcional;
- recebimentos/vendas existentes continuam funcionais;
- stock ledger mantém os saldos e reversões atuais;
- testes, typecheck e build permanecem verdes.

## 13. Critério de aceitação ponta a ponta

Com dados persistentes reais, escolher uma venda e reconstruir:

`destinação ← venda ← estoque/lotes ← recebimentos ← pesagens ← documentos/evidências ← origem`

incluindo divergências, correções, justificativas e validações humanas.

O caminho inverso também deve funcionar:

`origem → destinos finais`

Nenhuma etapa pode depender de linha sintética criada somente para a UI.

## 14. Estratégia de entrega

O trabalho nasce em `feat/m1-audit-traceability`, empilhado sobre `feat/m1-documents-center`, porque depende da fundação do Documents Center sem modificar ou fazer merge do PR #6. A implementação será dividida em incrementos pequenos, testáveis e revisáveis. O PR de Auditoria & Rastreabilidade deverá usar `feat/m1-documents-center` como base enquanto a pilha permanecer aberta.

## 15. Não objetivos e guardrails

- não fazer merge automático;
- não alterar o PR #6 como efeito colateral;
- não introduzir uma segunda fonte de verdade de estoque/auditoria;
- não usar service-role no frontend;
- não tornar documentos públicos;
- não chamar extração automática de validação/auditoria/certificação;
- não adicionar IA, blockchain ou QR obrigatório sem necessidade aprovada em fase posterior;
- não fazer refatoração não relacionada.
