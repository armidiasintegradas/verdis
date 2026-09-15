# Verdis Core Foundation — Design

Data: 2026-09-15  
Status: aprovado conceitualmente, aguardando revisão escrita antes do plano de implementação

## 1. Objetivo

Definir a fundação técnica e funcional da Verdis para que o produto possa crescer sem se fragmentar em sistemas independentes por público.

A Verdis terá um único núcleo operacional e diferentes experiências de usuário para Cooperativas, Empresas, Eventos, Gestão Pública e Central Verdis.

O primeiro produto não é um ESG completo. O MVP deve provar a tese de **ESG operacional e comprovável** começando por resíduos, circularidade e evidências.

## 2. Princípio central

A unidade principal do sistema é a **movimentação ambiental comprovável**.

A plataforma não será estruturada em torno de dashboards ou relatórios. A sequência base é:

`REGISTRO → EVIDÊNCIA → VALIDAÇÃO → INDICADOR → ALERTA → AÇÃO → RELATÓRIO`

Uma mesma movimentação pode produzir resultados diferentes para organizações distintas, respeitando permissões e finalidade.

Exemplo: uma cooperativa recebe 480 kg de papelão da Empresa X. O mesmo registro pode atualizar o estoque da cooperativa, a destinação da empresa, indicadores territoriais autorizados, metas de contrato e a visão consolidada da Verdis.

## 3. Ambientes

### 3.1 Cooperativas

Experiência operacional simples, voltada ao trabalho diário. Funções iniciais: receber material, registrar venda, registrar despesa, consultar estoque, materiais, documentos e evidências.

ESG não aparece como obrigação de preenchimento para o operador; os indicadores são derivados das operações.

### 3.2 Empresas

Visão operacional e executiva sobre geração, coleta, transporte, destinação, evidências, conformidade e indicadores.

### 3.3 Eventos

Sala de situação ambiental com pesagens, polos, equipes, cooperativas, materiais, ocorrências e evidências. A operação de campo deve ser mobile-first e de baixa fricção.

### 3.4 Gestão Pública

Primeira versão predominantemente de acompanhamento: mapa/rede, ranking, radar, produção, regularidade, contratos, visitas, indicadores e planos de ação.

### 3.5 Central Verdis

Backoffice administrativo para clientes, organizações, eventos, municípios, evidências, auditorias, inconsistências, usuários, permissões, indicadores, metodologias e configurações.

## 4. Core Verdis

O núcleo compartilhado deve conter, no mínimo:

- tenants;
- organizações;
- unidades;
- usuários;
- vínculos e papéis;
- materiais;
- movimentações;
- pesagens;
- contrapartes;
- documentos;
- evidências;
- validações;
- estoque derivado;
- vendas;
- contratos e metas quando aplicáveis;
- indicadores;
- ocorrências;
- eventos de auditoria.

## 5. Multi-tenancy e acesso

A plataforma deve nascer multi-tenant.

Hierarquia conceitual:

`Tenant → Organization → Unit → Membership/User`

A autorização não será apenas por tela. Deve controlar também quais registros o usuário pode consultar, criar, alterar, validar ou auditar.

O modelo precisa suportar:

- usuários vinculados a mais de uma organização;
- organizações com várias unidades;
- gestores com escopo institucional;
- usuários de campo com acesso restrito;
- compartilhamento controlado entre contrapartes;
- visões agregadas para Gestão Pública somente quando autorizadas;
- segregação de dados compatível com LGPD;
- trilha de auditoria para operações relevantes.

## 6. Movimentação como agregado central

Tipos iniciais previstos:

- recebimento;
- entrada;
- saída;
- coleta;
- transferência;
- triagem;
- venda;
- destinação;
- rejeito;
- ajuste justificado.

Cada movimentação deve possuir um identificador único e relacionar, quando aplicável:

- organização responsável;
- unidade;
- material;
- quantidade e unidade de medida;
- origem;
- destino;
- contraparte;
- data/hora do fato;
- usuário responsável;
- veículo/transportador;
- pesagem;
- evidências;
- documentos;
- contrato/projeto/meta;
- status de validação;
- trilha de auditoria.

## 7. Estoque e balanço de massa

O estoque não deve ser um número livremente editável como regra principal. Ele deve ser derivado de movimentações válidas.

Regra conceitual:

`ESTOQUE INICIAL + ENTRADAS - SAÍDAS ± AJUSTES JUSTIFICADOS = ESTOQUE ESPERADO`

O sistema deve permitir comparação com inventário físico declarado e apontar divergências.

Uma movimentação nunca deve criar saída superior ao estoque disponível sem uma exceção explícita, justificada e auditável.

## 8. Evidence Engine

O Verdis Evidence Engine é um componente central do produto.

Objetivo: diferenciar dado declarado de dado comprovado.

Estados conceituais iniciais:

1. **Autodeclarado** — informação inserida sem evidência suficiente.
2. **Evidenciado** — existe fotografia, ticket ou documento relacionado.
3. **Verificado documentalmente** — documento foi interpretado e comparado.
4. **Validado** — evidências cumprem a regra de validação definida para aquele contexto.
5. **Conciliado** — evidências independentes e/ou contrapartes confirmam a mesma movimentação.
6. **Rastreabilidade comprovada** — cadeia documental complementar aplicável está presente.
7. **Auditado** — terceira parte autorizada examinou efetivamente o registro ou amostra.

`VALIDADO` e `AUDITADO` são estados diferentes.

A IA não concede status de auditoria.

## 9. Documentos e IA

Regra obrigatória:

> IA interpreta. O documento comprova.

Ao capturar um ticket, NF ou outro documento, a plataforma deve preservar:

- arquivo original;
- metadados do arquivo;
- hash;
- dados extraídos;
- confiança de extração;
- comparação com os dados da movimentação;
- decisão humana quando necessária;
- histórico de alterações.

A IA deve reduzir digitação, identificar campos e apontar divergências. O usuário deve preferencialmente confirmar dados reconhecidos em vez de redigitá-los.

## 10. Antifraude inicial

O MVP deve conter mecanismos básicos de prevenção de duplicidade e inconsistência.

Verificações iniciais:

- hash do arquivo;
- número do documento;
- chave fiscal, quando aplicável;
- CNPJ/CPF das partes quando disponível e permitido;
- data/hora;
- placa;
- peso;
- valor;
- contraparte;
- reutilização do mesmo documento em outra movimentação;
- coerência com estoque e movimentações anteriores.

Movimentações com suspeita relevante não devem alimentar indicadores considerados comprovados até revisão.

## 11. Perfis iniciais

### Central Verdis
- administrador da plataforma;
- analista Verdis;
- auditor/validador.

### Cooperativa
- gestor da organização;
- operador;
- financeiro;
- associado com acesso restrito, se habilitado.

### Empresa
- gestor ambiental;
- operador;
- diretoria/ESG.

### Evento
- gestor do evento;
- supervisor;
- operador de campo.

### Gestão Pública
- gestor público;
- fiscal/técnico;
- gestor de contratos.

Papéis são ponto de partida; permissões efetivas devem ser representadas de forma granular no modelo de autorização.

## 12. MVP

O MVP v1 é:

**Resíduos + Circularidade + Evidências.**

P0 funcional:

- autenticação;
- tenants, organizações e unidades;
- usuários e permissões;
- cadastro de empresas/cooperativas;
- materiais;
- movimentações;
- pesagens;
- captura/upload de ticket;
- IA para leitura documental;
- evidências;
- estoque e balanço de massa;
- venda de materiais;
- NF/documento associado;
- validação, conciliação e inconsistências;
- dashboard por perfil;
- relatório;
- logs de auditoria.

Ficam fora do núcleo inicial: água, energia, carbono ampliado, biodiversidade, RH, Social completo, Governança completa, fornecedores, benchmarking e IA preditiva.

## 13. Pilotos

### Piloto A — Cooperativa

`entrada → triagem → estoque → venda → NF → balanço de massa`

### Piloto B — Empresa

`geração → coleta → transportador → cooperativa/destinador → comprovação → indicador`

### Piloto C — Evento

`pesagem → equipe → cooperativa → material → evidência → dashboard → relatório`

Gestão Pública entra depois que a rede já tiver dados reais suficientes para produzir visão territorial útil.

## 14. Critérios de sucesso do MVP

Uma cadeia ponta a ponta deve permitir responder, de forma rastreável:

1. quanto foi movimentado;
2. quem registrou;
3. qual evidência sustenta o dado;
4. se existe divergência;
5. quem enviou e quem recebeu;
6. se o balanço de massa fecha;
7. qual o estado de confiabilidade/validação;
8. quem validou ou auditou;
9. quais indicadores foram afetados;
10. se a cadeia pode ser reconstruída posteriormente.

## 15. Ferramentas e fluxo de trabalho

- **GitHub** — fonte da verdade para código, documentação, issues, PRs, migrations e decisões técnicas.
- **Stitch** — desenho e validação de UX/UI antes da implementação de grandes interfaces.
- **Antigravity** — implementação, integração e testes seguindo especificações versionadas.

Fluxo:

`PRD → domínio → dados → UX/Stitch → issue GitHub → branch → Antigravity → testes → PR → homologação → merge`

Prompts relevantes do Antigravity devem ser versionados na documentação do projeto para reduzir dependência de contexto de chat.

## 16. Direção técnica para a próxima fase

Antes de implementar telas completas, a próxima fase deve definir e validar:

- modelo de dados relacional;
- limites de cada agregado;
- chaves e relacionamentos;
- política de multi-tenancy;
- estratégia de autenticação/autorização;
- RLS;
- storage de documentos;
- estados e transições de movimentações;
- regras de estoque;
- modelo de evidências e validações;
- eventos de auditoria.

A tecnologia de backend deverá ser escolhida para suportar essas regras; PostgreSQL/Supabase é a opção preferencial a ser avaliada no plano técnico, não uma dependência já implementada.
