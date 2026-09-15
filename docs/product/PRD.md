# PRD — Verdis v1.0

## 1. Visão

A Verdis é uma plataforma integrada de gestão da circularidade e impacto socioambiental. O produto converte atividades operacionais reais em dados rastreáveis, evidenciados e úteis para Cooperativas, Empresas, Eventos, Gestão Pública e Central Verdis.

A primeira versão não pretende entregar todo o ESG. O MVP deve provar a tese de que a operação ambiental pode ser registrada uma vez, comprovada e transformada automaticamente em informação confiável para públicos diferentes.

## 2. Tese do produto

Princípio central:

> Um registro. Múltiplos resultados.

A plataforma deve evitar que diferentes atores preencham sistemas separados com o mesmo fato operacional.

Exemplo: uma empresa envia material, uma cooperativa recebe e o sistema concilia a transação. Esse único fato pode alimentar estoque, destinação, metas, indicadores e relatórios, de acordo com permissões e finalidade.

## 3. Objetivos do MVP

O MVP deve demonstrar que a Verdis consegue:

1. capturar dados operacionais;
2. associar evidências a esses dados;
3. interpretar documentos e reduzir digitação;
4. identificar divergências e duplicidades;
5. manter balanço de massa coerente;
6. conciliar informações entre contrapartes;
7. gerar visões diferentes a partir da mesma base;
8. reconstruir a cadeia de uma movimentação;
9. produzir dashboards e relatórios a partir dos registros;
10. manter trilha de auditoria.

## 4. Escopo funcional P0

### 4.1 Identidade e acesso

- autenticação;
- recuperação de acesso;
- tenants;
- organizações;
- unidades;
- usuários;
- memberships;
- papéis;
- permissões granulares;
- segregação por escopo.

### 4.2 Cadastros operacionais

- empresas;
- cooperativas;
- unidades;
- materiais;
- contrapartes;
- veículos/transportadores quando aplicável;
- compradores/destinadores quando aplicável.

### 4.3 Movimentações

Tipos iniciais:

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

Campos mínimos por movimentação:

- id único;
- tipo;
- organização responsável;
- unidade;
- material;
- quantidade;
- unidade de medida;
- origem;
- destino;
- contraparte;
- data/hora;
- usuário responsável;
- status operacional;
- status de evidência/validação;
- timestamps de criação e atualização.

### 4.4 Pesagens

- peso bruto;
- tara;
- peso líquido;
- data/hora;
- origem da pesagem;
- placa, quando disponível;
- documento/evidência relacionada;
- diferença entre peso declarado e peso evidenciado.

### 4.5 Evidências e documentos

- captura por câmera;
- upload;
- preservação do arquivo original;
- classificação do documento;
- extração de campos;
- confiança da extração;
- associação a movimentação;
- hash;
- status de revisão;
- histórico.

Documentos iniciais:

- ticket de balança;
- nota fiscal/XML/PDF/foto;
- comprovante de destinação;
- MTR/CDF quando incluídos na fase correspondente;
- fotos operacionais.

### 4.6 IA documental

A IA deve:

- identificar tipo de documento;
- sugerir campos extraídos;
- comparar documento e movimentação;
- apontar divergências;
- permitir confirmação humana;
- nunca substituir o documento original;
- nunca atribuir status de auditoria.

### 4.7 Evidence Engine

Estados iniciais:

- autodeclarado;
- evidenciado;
- verificado documentalmente;
- validado;
- conciliado;
- rastreabilidade comprovada;
- auditado.

Cada mudança de estado deve ter regra explícita, ator responsável e evento de auditoria.

### 4.8 Antifraude e consistência

- hash de documento;
- detecção de duplicidade;
- número/chave fiscal;
- comparação entre partes;
- comparação de peso, data, placa e valor;
- coerência com movimentações anteriores;
- bloqueio ou sinalização de registros suspeitos;
- revisão humana quando exigida.

### 4.9 Estoque e balanço de massa

- estoque derivado de movimentações;
- estoque inicial controlado;
- entradas;
- saídas;
- ajustes justificados;
- inventário físico declarado;
- divergência calculada;
- fechamento por período/material/unidade;
- alertas de inconsistência.

### 4.10 Vendas

- material;
- quantidade;
- comprador;
- valor/kg;
- valor total;
- documento fiscal associado;
- saída de estoque;
- vínculo com movimentações anteriores quando aplicável.

### 4.11 Auditoria

Registrar, para ações relevantes:

- ator;
- organização;
- ação;
- entidade afetada;
- estado anterior quando aplicável;
- estado posterior quando aplicável;
- data/hora;
- origem técnica quando aplicável.

## 5. Experiências por público

### 5.1 Cooperativa

Objetivo: resolver operação diária com o mínimo de fricção.

Home inicial:

- receber material;
- registrar venda;
- registrar despesa;
- recebido hoje;
- vendido hoje;
- estoque;
- alertas relevantes.

Navegação prevista:

`Início | Materiais | Estoque | Vendas | Financeiro | Associados | Documentos`

O ESG acontece principalmente por trás da operação.

### 5.2 Empresa

Objetivo: acompanhar geração, coleta, destinação, comprovação e indicadores.

Visão operacional:

`Movimentações | Coletas | Documentos | Destinação | Contrapartes | Evidências | Indicadores`

Visão executiva deve priorizar performance, pendências e confiança dos dados, não listas de documentos.

### 5.3 Evento

Objetivo: funcionar como sala de situação ambiental.

Dashboard:

- toneladas recuperadas;
- meta;
- catadores;
- cooperativas;
- equipes;
- ocorrências;
- evidências recentes;
- mapa operacional.

Fluxo de campo deve ser mobile-first:

`Polo → Cooperativa → Material → Peso → Evidência → Confirmar`

### 5.4 Gestão Pública

Objetivo inicial: acompanhar rede e política pública sem criar outro ERP completo.

Visão:

- mapa;
- ranking;
- radar;
- organizações;
- produção;
- regularidade;
- contratos;
- indicadores;
- visitas;
- planos de ação.

### 5.5 Central Verdis

Objetivo: administração, suporte, inteligência, validação e visão consolidada.

Funções iniciais:

- clientes;
- organizações;
- eventos;
- municípios;
- movimentações;
- evidências;
- inconsistências;
- auditorias;
- usuários;
- permissões;
- metodologias;
- configurações.

## 6. Central de Evidências

Tela transversal prioritária.

Deve permitir:

- busca por período, material, organização, contraparte, status, documento e movimentação;
- contagem de registros por estado;
- abertura da cadeia completa de uma evidência;
- comparação declarado x documento;
- visualização de documento original;
- histórico de validação;
- indicação de confiança;
- revisão de inconsistências.

## 7. Requisitos não funcionais iniciais

- arquitetura multi-tenant;
- banco relacional;
- RLS ou mecanismo equivalente no nível de dados;
- storage seguro para documentos;
- URLs/documentos privados por padrão;
- trilha de auditoria imutável para eventos relevantes;
- timestamps consistentes;
- suporte a mobile para operação de campo;
- performance adequada para dashboards operacionais;
- observabilidade e logs técnicos desde a primeira implantação utilizável;
- nenhum segredo no frontend ou no GitHub.

## 8. Fora do escopo do MVP

- água;
- energia;
- inventário de carbono completo;
- biodiversidade;
- RH completo;
- Social completo;
- Governança completa;
- marketplace de materiais;
- benchmarking avançado;
- IA preditiva;
- automações avançadas;
- integrações externas extensas não essenciais aos pilotos.

## 9. Pilotos

### A — Cooperativa

`entrada → triagem → estoque → venda → NF → balanço de massa`

### B — Empresa

`geração → coleta → transportador → cooperativa/destinador → comprovação → indicador`

### C — Evento

`pesagem → equipe → cooperativa → material → evidência → dashboard → relatório`

## 10. Critério de aceite do MVP

O MVP só é considerado funcionalmente homologável quando uma cadeia ponta a ponta permitir responder:

- quanto foi movimentado;
- quem registrou;
- quando ocorreu;
- quem enviou;
- quem recebeu;
- qual material;
- qual documento sustenta o dado;
- quais campos foram extraídos;
- se houve divergência;
- se existe duplicidade;
- se o balanço de massa fecha;
- qual é o estado de validação;
- quem validou/auditou;
- quais indicadores foram afetados;
- como reconstruir a cadeia posteriormente.

## 11. Roadmap pós-MVP

- **Fase 1 — Circularidade:** resíduos, cooperativas, rastreabilidade, evidências e relatórios.
- **Fase 2 — Compliance:** PGRS, RGRS, MTR/CDF, licenças, obrigações, alertas e auditoria.
- **Fase 3 — Ambiental:** água, energia, carbono e metas ambientais.
- **Fase 4 — ESG:** Social, Governança, fornecedores, riscos e planos de ação.
- **Fase 5 — Inteligência:** benchmarking, anomalias, recomendações, automações e IA preditiva.

## 12. Fluxo de desenvolvimento

GitHub é a fonte da verdade. Stitch é usado para desenho e validação das grandes interfaces. Antigravity implementa o que estiver especificado e versionado.

Nenhum grande módulo deve nascer somente de um prompt solto. Decisões relevantes devem existir em documentação, issue, commit ou PR.
