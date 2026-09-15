# Verdis — Domain Model v1

## 1. Objetivo

Definir o vocabulário de domínio e os principais agregados da Verdis antes do desenho físico do banco. Este documento descreve responsabilidades, fronteiras e relacionamentos. Não é ainda o schema SQL definitivo.

## 2. Princípio de modelagem

A Verdis deve representar fatos operacionais reais. O domínio é organizado em torno de movimentações, evidências, validações e atores organizacionais.

Regra central:

> Relatórios, dashboards e indicadores são projeções do domínio; não são a fonte primária da verdade.

## 3. Tenant

Representa o limite lógico superior de isolamento de dados.

Responsabilidades:

- agrupar organizações sob uma mesma contratação/instância lógica;
- delimitar configurações;
- delimitar políticas de acesso;
- suportar clientes institucionais com múltiplas organizações/unidades.

Relacionamentos principais:

- possui muitas Organizations;
- possui muitos Memberships por meio de Organizations/Units;
- possui configurações próprias.

## 4. Organization

Representa uma entidade participante do ecossistema.

Tipos esperados:

- cooperativa;
- empresa;
- órgão público;
- operador de evento;
- transportador;
- destinador/reciclador;
- comprador;
- Verdis/administração.

Responsabilidades:

- identidade jurídica/operacional;
- dados cadastrais;
- papéis que pode exercer;
- unidades associadas;
- usuários vinculados;
- participação em movimentações.

Uma mesma Organization pode exercer mais de um papel conforme o contexto.

## 5. Unit

Representa uma unidade operacional de uma Organization.

Exemplos:

- fábrica;
- filial;
- galpão da cooperativa;
- polo de evento;
- secretaria/unidade administrativa;
- centro de triagem.

Responsabilidades:

- endereço/localização;
- escopo operacional;
- configuração local;
- origem/destino de movimentações;
- estoque próprio quando aplicável.

## 6. User

Representa a identidade autenticada de uma pessoa.

O User não deve carregar diretamente toda a autorização. O acesso decorre de vínculos e papéis.

Responsabilidades:

- identidade de autenticação;
- dados mínimos de perfil;
- histórico de ações;
- vínculo com Memberships.

## 7. Membership

Representa a relação entre User e Organization/Unit.

Responsabilidades:

- papel;
- escopo;
- status do vínculo;
- datas de vigência;
- permissões complementares quando necessário.

Exemplo:

`User A → Organization Cooperativa X → Unit Galpão Principal → role=operator`

Um User pode possuir vários Memberships.

## 8. Role e Permission

Role é um agrupamento legível de permissões.

Exemplos:

- platform_admin;
- verdis_analyst;
- auditor;
- cooperative_manager;
- operator;
- finance;
- environmental_manager;
- executive_viewer;
- event_manager;
- field_operator;
- public_manager;
- inspector;
- contract_manager.

Permission deve ser granular e orientada a capacidades.

Exemplos:

- movement.create;
- movement.read;
- movement.correct;
- evidence.upload;
- evidence.validate;
- audit.review;
- stock.read;
- sale.create;
- report.generate.

## 9. Material

Representa uma categoria de material/resíduo.

Responsabilidades:

- nome canônico;
- categoria;
- unidade padrão;
- aliases;
- atributos necessários à classificação;
- status ativo/inativo.

O Material deve ser reutilizável entre organizações, mas pode aceitar classificações locais mapeadas para uma categoria canônica.

## 10. Counterparty

Counterparty é uma visão contextual de outra Organization/Unit envolvida em uma operação.

Não deve duplicar organizações existentes sem necessidade.

Responsabilidades:

- facilitar referência a remetente, comprador, transportador, destinador ou recebedor;
- suportar contraparte ainda não participante da plataforma;
- permitir posterior resolução/mapeamento para uma Organization real.

## 11. Movement

Movement é o agregado central da Verdis.

Representa um fato operacional envolvendo material.

Tipos iniciais:

- receipt;
- inbound;
- outbound;
- collection;
- transfer;
- sorting;
- sale;
- destination;
- reject;
- adjustment.

Campos conceituais essenciais:

- id;
- tenant_id;
- organization_id;
- unit_id;
- movement_type;
- material_id;
- quantity;
- unit_of_measure;
- occurred_at;
- source organization/unit/counterparty;
- destination organization/unit/counterparty;
- created_by;
- operational_status;
- evidence_status;
- validation_status;
- created_at;
- updated_at.

Regras:

- Movement não deve ser apagado silenciosamente após produzir efeito operacional;
- correções relevantes devem preservar histórico;
- movimentações que afetam estoque devem gerar lançamentos derivados;
- mudanças de estado relevantes devem gerar AuditEvents.

## 12. Weighing

Representa um evento de pesagem associado a uma movimentação.

Campos conceituais:

- gross_weight;
- tare_weight;
- net_weight;
- weighed_at;
- scale/location;
- vehicle_plate;
- source_document_id;
- declared_weight;
- divergence_absolute;
- divergence_percent.

Uma Movement pode ter uma ou mais Weighings conforme o caso de uso.

## 13. Document

Representa o artefato documental original preservado pelo sistema.

Exemplos:

- ticket de balança;
- NF;
- XML;
- PDF;
- MTR;
- CDF;
- comprovante;
- contrato;
- foto operacional.

Campos conceituais:

- storage reference;
- hash;
- mime type;
- original filename;
- uploaded_by;
- uploaded_at;
- document_type;
- issuer/recipient quando extraído;
- external key/number quando aplicável;
- extraction status.

O arquivo original é imutável. Metadados derivados podem evoluir mantendo histórico.

## 14. Evidence

Evidence representa o uso de um Document ou outro sinal verificável para sustentar uma afirmação do domínio.

Exemplos:

- ticket comprova peso;
- NF comprova comercialização;
- foto comprova ocorrência;
- contraparte confirma recebimento.

Campos conceituais:

- subject type/id;
- evidence type;
- source document/event;
- claimed fields;
- extracted fields;
- confidence;
- status;
- created_at.

Uma Movement pode possuir várias Evidences.

## 15. DocumentExtraction

Representa uma execução de interpretação automática sobre um Document.

Responsabilidades:

- armazenar campos extraídos;
- armazenar confiança;
- registrar modelo/versão de processamento;
- preservar resultado bruto quando necessário;
- permitir reprocessamento sem destruir extrações anteriores.

A extração nunca substitui o Document.

## 16. Validation

Representa uma decisão de validação sobre Movement, Evidence, Document ou conjunto relacionado.

Campos conceituais:

- subject;
- validation_type;
- status;
- rule/methodology;
- actor;
- reason;
- created_at.

Estados/resultados possíveis devem ser explícitos e rastreáveis.

Validação automática e validação humana devem ser distinguíveis.

## 17. Reconciliation

Representa o casamento entre registros independentes.

Exemplos:

- saída da Empresa X x entrada da Cooperativa Y;
- venda da Cooperativa x confirmação/nota da Recicladora Z;
- quantidade declarada x ticket de balança.

Responsabilidades:

- ligar os lados da transação;
- calcular divergências;
- registrar nível de correspondência;
- indicar necessidade de revisão.

## 18. StockLedgerEntry

Representa um lançamento derivado que afeta estoque.

Não deve ser criado manualmente fora de regras autorizadas.

Campos conceituais:

- organization/unit;
- material;
- movement_id;
- direction;
- quantity;
- occurred_at;
- balance impact.

O estoque corrente é uma projeção dos lançamentos válidos.

## 19. StockSnapshot

Representa uma fotografia calculada ou declarada do estoque em um momento.

Tipos:

- system_calculated;
- physical_count.

Responsabilidades:

- facilitar fechamento por período;
- comparar estoque esperado e físico;
- registrar divergência;
- suportar auditoria.

## 20. Sale

Representa a dimensão comercial de uma saída de material.

Relaciona-se a Movement, mas mantém atributos comerciais próprios.

Campos conceituais:

- seller organization/unit;
- buyer/counterparty;
- material;
- quantity;
- unit_price;
- total_amount;
- movement_id;
- fiscal document;
- sold_at.

## 21. OperationalEvent / Occurrence

Representa uma ocorrência operacional que não é necessariamente uma movimentação de massa.

Exemplos:

- coletor transbordando;
- atraso;
- EPI inadequado;
- mistura de rejeitos;
- equipamento indisponível.

Campos conceituais:

- type;
- severity;
- organization/unit/event context;
- location;
- evidence;
- assigned_to;
- status;
- opened_at;
- resolved_at.

## 22. Project / Event

Representa um contexto operacional temporário ou projeto monitorado.

Exemplos:

- Carnaval do Recife;
- São João;
- programa patrocinado;
- contrato específico.

Responsabilidades:

- período;
- participantes;
- unidades/polos;
- metas;
- materiais;
- equipes;
- movimentações associadas;
- indicadores;
- relatório final.

## 23. Contract

Representa instrumento contratual relacionado ao acompanhamento.

Campos conceituais:

- parties;
- period;
- scope;
- status;
- obligations;
- linked projects/organizations;
- linked targets.

O Contract pode ser P1 no produto, mas o domínio deve reservar a possibilidade de associação desde cedo.

## 24. Target

Representa meta mensurável.

Exemplos:

- toneladas/mês;
- taxa de recuperação;
- desvio de aterro;
- prazo documental.

Campos conceituais:

- metric;
- target value;
- period;
- scope;
- methodology;
- owner/responsible.

## 25. Indicator

Indicator é uma projeção calculada, não a fonte primária do dado.

Todo indicador considerado comprovável deve conseguir referenciar:

- valor;
- período;
- metodologia;
- fontes;
- evidências;
- meta quando houver;
- responsável/metodologia de cálculo.

## 26. AuditEvent

Representa fato imutável de auditoria do sistema.

Exemplos:

- movement.created;
- movement.corrected;
- document.uploaded;
- evidence.validated;
- reconciliation.confirmed;
- permission.changed.

Campos conceituais:

- actor;
- tenant;
- organization;
- action;
- subject type/id;
- timestamp;
- previous state/reference quando aplicável;
- new state/reference quando aplicável;
- technical context quando aplicável.

## 27. Estados do Evidence Engine

Estados de alto nível:

1. AUTODECLARED
2. EVIDENCED
3. DOCUMENT_VERIFIED
4. VALIDATED
5. RECONCILED
6. TRACEABILITY_PROVEN
7. AUDITED

Esses estados não devem ser tratados como uma sequência automática obrigatória em todos os casos. A regra de transição depende do tipo de movimentação, evidência e metodologia aplicável.

## 28. Relações principais

Visão simplificada:

```text
Tenant
 └── Organization
      ├── Unit
      ├── Membership ── User
      ├── Movement
      │    ├── Material
      │    ├── Weighing
      │    ├── Evidence ── Document ── DocumentExtraction
      │    ├── Validation
      │    ├── Reconciliation
      │    ├── StockLedgerEntry
      │    └── AuditEvent
      ├── Sale ── Movement
      ├── Project/Event
      ├── Contract
      └── Target

Indicator = projection from validated domain data
Stock = projection from StockLedgerEntry
Report = projection from domain data + methodology
```

## 29. Invariantes iniciais

1. Nenhuma evidência substitui o documento original.
2. Nenhuma IA pode marcar registro como AUDITED.
3. Toda correção relevante preserva histórico.
4. Estoque operacional deriva de lançamentos/movimentações válidos.
5. Saída incompatível com estoque gera bloqueio ou exceção auditável.
6. Documento reutilizado deve ser detectável por hash/chave/metadados.
7. Dados de outro tenant nunca devem ser acessíveis por simples manipulação de identificador.
8. Permissão de interface não substitui autorização no backend/banco.
9. Indicadores comprováveis devem ser rastreáveis até dados-fonte e evidências.
10. Relatórios não podem alterar a fonte operacional.

## 30. Próxima transformação

Após aprovação deste modelo, ele deve ser transformado em:

- modelo lógico relacional;
- tabelas e chaves;
- índices;
- enums/estados;
- constraints;
- políticas RLS;
- storage buckets e políticas;
- eventos/funções de domínio;
- migrations versionadas.

Esse trabalho pertence ao plano de implementação da M0 — Verdis Core Foundation.
