# VERDIS M1 — Fluxo Profundo de Recebimentos

Status: **design técnico proposto para revisão**.

Data: 16/09/2026

## 1. Objetivo

Implementar o fluxo profundo de Recebimentos do M1 Cooperative Pilot como um vertical slice persistente sobre a arquitetura existente, preservando o VERDIS UI SYSTEM V1.1 e as máquinas de estado homologadas no Stitch.

Fluxo funcional:

`Dados → Comprovação → Conferência → Decisão/Justificativa → Concluir`

O incremento deve persistir movimento, documento, evidência, extração quando disponível, decisão humana e efeito de estoque sem transformar estados efêmeros de UI em fatos de domínio.

## 2. Princípios obrigatórios

1. O recebimento nasce como `movement` com `movement_type = receipt` e `status = draft`.
2. Upload, falha de rede ou processamento documental nunca podem apagar o rascunho do movimento.
3. O original enviado é preservado no bucket privado `evidence-documents` e registrado em `documents`.
4. Extração automática não sobrescreve silenciosamente o valor informado pelo operador.
5. `Documento processado` e `divergência operacional` são dimensões independentes.
6. Divergência exige decisão humana explícita; nenhuma opção inicia selecionada.
7. No cenário homologado, manter o valor registrado diante de divergência exige justificativa.
8. Somente `draft → posted` produz efeito de estoque.
9. A confirmação é atômica no banco.
10. O frontend nunca lança diretamente em `stock_ledger_entries`.

## 3. Abordagem escolhida

A implementação reutiliza as estruturas existentes:

- `movements`: movimento e quantidade efetivamente adotada;
- `documents`: identidade e preservação do arquivo original;
- `document_extractions`: histórico append-only da interpretação automática;
- `evidences`: vínculo movimento-documento, valores declarados e extraídos;
- `validations`: decisão humana e justificativa;
- `stock_ledger_entries`: efeito de estoque gerado após `posted`.

Não criar tabela específica para passos do wizard.

## 4. Componentes e responsabilidades

### 4.1 `ReceiptFlow`

Orquestra a jornada de UI e navegação entre passos. Não acessa SQL diretamente e não contém regra de estoque.

### 4.2 `ReceiptDraftService`

Responsável por:

- criar o `movement` draft;
- atualizar campos editáveis enquanto o movimento permanecer `draft`;
- nunca marcar o movimento como `posted`.

### 4.3 `EvidenceUploadService`

Responsável por:

- calcular SHA-256 do arquivo;
- enviar ao bucket `evidence-documents`;
- criar o registro em `documents`;
- criar/ligar `evidence` ao movimento;
- manter o draft intacto em qualquer falha de upload.

### 4.4 `ReceiptConferenceService`

Monta um view model de conferência sem decidir pelo operador.

Estados derivados:

- `processing`;
- `match`;
- `divergence`.

Ele só usa dados documentais quando uma extração realmente existe.

### 4.5 `ConfirmReceiptService`

Única porta de efetivação. Chama o RPC transacional `confirm_receipt_m1(...)`.

## 5. Modelo de divergência

Exemplo homologado:

- registrado: `480 kg`;
- documento: `482 kg`;
- diferença: `+2 kg`;
- diferença percentual: `+0,42%`.

Persistência conceitual:

```text
MOVEMENT
quantity_kg = 480
status = draft

EVIDENCE
claimed_fields.quantity_kg = 480
extracted_fields.quantity_kg = 482

DOCUMENT_EXTRACTION
extracted_fields.quantity_kg = 482

VALIDATION
validation_type = operator_resolution
status = accepted
automated = false
actor_user_id = usuário atual
rule_code = RECEIPT_USE_DOCUMENT_QUANTITY
         ou RECEIPT_KEEP_REGISTERED_QUANTITY
reason = justificativa quando obrigatória
```

### 5.1 Manter 480 kg

- `movements.quantity_kg` permanece `480`;
- a decisão humana é registrada em `validations`;
- a justificativa é obrigatória no cenário homologado;
- após validação, o movimento vai para `posted`.

### 5.2 Usar 482 kg

Na mesma transação de confirmação:

1. atualizar o draft para `482`;
2. registrar a decisão humana;
3. alterar para `posted`.

O valor original `480` continua preservado em `evidences.claimed_fields`.

## 6. RPC transacional `confirm_receipt_m1`

Entrada mínima:

- `movement_id`;
- `decision`: `use_document | keep_registered | registered_only`;
- `evidence_id`, quando aplicável;
- `reason`, quando obrigatória.

Regras obrigatórias:

1. validar usuário, escopo e permissão;
2. exigir movimento `receipt` + `draft`;
3. em `use_document`, exigir evidência processada e quantidade documental válida;
4. em `keep_registered` diante de divergência, exigir justificativa não vazia;
5. registrar a `validation` humana;
6. atualizar a quantidade adotada se a decisão for `use_document`;
7. alterar o movimento para `posted`;
8. deixar o trigger existente criar o ledger;
9. retornar o movimento confirmado e o saldo atualizado.

A função deve falhar integralmente diante de qualquer pré-condição inválida. Não pode haver quantidade alterada sem confirmação, decisão registrada sem postagem correspondente ou estoque parcial.

Uma segunda tentativa de confirmação de movimento já `posted` deve ser rejeitada sem duplicar estoque.

## 7. Estados documentais

Estados canônicos de UI:

```text
NONE
SELECTED
UPLOADING
UPLOADED_PROCESSING
PROCESSED
UPLOAD_FAILED
PENDING_EVIDENCE
```

Não persistir como domínio:

- `SELECTED`;
- percentual de upload;
- erro transitório de rede.

Persistir fatos duráveis:

- arquivo armazenado;
- documento registrado;
- evidência vinculada;
- extração concluída;
- decisão humana;
- ausência de documento quando isso exigir ação posterior.

O enum `review_status` não é a máquina de estado de upload.

## 8. Rotas

Rota de um recebimento em andamento:

`/recebimentos/novo/:movementId`

Passo solicitado na URL:

- `?step=dados`;
- `?step=comprovacao`;
- `?step=conferencia`;
- `?step=concluir`.

`movementId` é a âncora persistente. A query string expressa intenção de navegação, mas nunca pode forçar um estado incompatível com os fatos persistidos.

## 9. Reconstrução determinística após refresh/reentrada

A aplicação deriva o estado efetivo nesta ordem de precedência:

1. **Se `movement.status = posted`** → abrir conclusão/detalhe somente leitura; nunca reabrir edição.
2. **Se existe divergência processada sem `validation` de resolução** → abrir `conferencia` em estado `divergence`.
3. **Se existe decisão `keep_registered` que ainda não satisfaz a justificativa obrigatória** → abrir `conferencia` no subestado `justification`.
4. **Se existe documento preservado e não existe extração concluída** → abrir `conferencia` em estado `processing` quando o usuário já tiver avançado da comprovação; caso contrário, mostrar `comprovacao` com documento enviado/processando.
5. **Se existe documento processado sem divergência** → abrir `conferencia` em estado `match`.
6. **Se o draft existe e o operador marcou explicitamente o caminho sem documento** → abrir `conferencia` com dados registrados e comprovação pendente.
7. **Se o draft existe e nenhum fato posterior existe** → abrir `comprovacao`.
8. **Antes da criação do draft** → rota de criação inicia em `dados` sem `movementId`; ao salvar dados com sucesso, navegar para `/recebimentos/novo/:movementId?step=comprovacao`.

Para suportar a distinção entre itens 4, 6 e 7 sem criar uma tabela de wizard, a aplicação pode persistir apenas um marcador operacional mínimo no draft ou em metadado próprio do fluxo, definido no plano de implementação. Esse marcador não pode duplicar estados do domínio nem produzir efeito de estoque.

## 10. Upload interrompido

Se o refresh ocorrer antes de existir registro durável de documento, a UI retorna ao estado seguro de comprovação e não inventa arquivo enviado.

Se `documents` já contiver o arquivo preservado e ligado ao movimento por `evidences`, o upload é considerado concluído mesmo que a extração esteja pendente.

## 11. Comportamento por passo

### 11.1 Dados

Campos:

- origem;
- material;
- quantidade/peso;
- data/hora.

Ao avançar:

- criar ou atualizar `movement` em `draft`;
- não alterar estoque.

### 11.2 Comprovação — vazio

Ações:

- `TIRAR FOTO`;
- `ENVIAR ARQUIVO`;
- `CONTINUAR SEM DOCUMENTO`.

### 11.3 Arquivo selecionado

Estado local com nome, tipo e tamanho. `ENVIAR DOCUMENTO` é a ação principal e `CONTINUAR` normal permanece desabilitado até o envio enquanto o caminho documental estiver ativo.

### 11.4 Enviando

Bloquear ações conflitantes e impedir duplicação de upload.

### 11.5 Documento enviado / Processando

- original preservado;
- `VISUALIZAR DOCUMENTO` disponível;
- processamento segue em segundo plano;
- operador pode avançar;
- não remover/trocar o original neste estado no M1.

### 11.6 Falha de upload

- draft intacto;
- `TENTAR NOVAMENTE`;
- trocar arquivo;
- tirar outra foto;
- continuar sem documento;
- sem detalhes técnicos de storage/API na UI operacional.

### 11.7 Conferência / Processando

Mostrar apenas dados registrados e status documental. Não fabricar extração. O operador pode confirmar com os dados registrados conforme contrato homologado.

### 11.8 Conferência / Divergência

Mostrar registrado, documental e diferença. Nenhuma decisão começa selecionada. CTA de confirmação permanece bloqueado até decisão válida.

### 11.9 Justificativa

Quando obrigatória:

- textarea vazia bloqueia `CONFIRMAR RECEBIMENTO`;
- tela preserva registrado, documental, diferença e decisão.

### 11.10 Conclusão

Mostrar:

- quantidade final adotada;
- quantidade documental quando existente;
- diferença;
- decisão;
- justificativa quando houver;
- documento;
- saldo anterior;
- entrada confirmada;
- novo saldo;
- rastreabilidade;
- `VER MOVIMENTAÇÃO`;
- `RECEBER OUTRO MATERIAL`.

## 12. Processamento e extração no M1

O provedor final de OCR/IA de produção está fora do escopo deste incremento, mas o contrato de integração deve ser real.

Para testes e ambiente de desenvolvimento, a implementação pode usar fixtures controladas ou uma função de teste para inserir `document_extractions` coerentes. Essa simulação deve ficar explicitamente separada do caminho de produção e nunca ser apresentada como extração real.

Quando uma extração é concluída, o registro em `document_extractions` permanece append-only. O `ReceiptConferenceService` lê a extração relevante e compõe o view model; ele não modifica o movimento.

## 13. Pendências

Pendência = ação humana necessária.

Casos do fluxo:

- recebimento confirmado sem documento e que requer anexação posterior;
- falha de upload abandonada quando ainda houver ação necessária;
- divergência aguardando decisão;
- justificativa obrigatória pendente.

Processamento documental saudável não gera pendência.

A visão de Pendências pode ser derivada dos fatos existentes; este incremento não exige uma nova tabela `pending_items`.

## 14. Erros

### Formulário

Erro junto ao campo, sem perder rascunho.

### Upload

Falha não altera movimento nem estoque.

### Extração

Falha nunca remove o original. Se exigir intervenção, gera estado acionável sem transformar processamento normal em erro.

### Confirmação

Falha transacional mantém o movimento em `draft`, sem ledger parcial e sem decisão parcialmente efetivada.

## 15. Segurança

Reutilizar:

- `AuthProvider`;
- `ScopeProvider`;
- RLS existente;
- permissões `movement.create`, `movement.read`, `movement.correct`, `evidence.upload`, `evidence.read` conforme aplicável.

`confirm_receipt_m1` deve validar autorização no banco e nunca confiar apenas na UI.

## 16. Estoque

O frontend não escreve no ledger.

Regra:

`saldo novo = saldo anterior + quantidade adotada`

O trigger existente em `movements` continua sendo a única origem automática da entrada de estoque quando ocorre `draft → posted`.

## 17. Reutilização futura em Vendas

Devem ser reutilizáveis:

- upload;
- preservação do original;
- processamento assíncrono;
- conferência;
- comparação registrado × documental;
- decisão humana;
- justificativa;
- retomada do wizard;
- tratamento de erros.

Vendas adicionará posteriormente regras próprias de saldo, comprador, preço/kg e valor total.

## 18. Estratégia de testes

### Unidade

- diferença absoluta/percentual;
- `processing | match | divergence`;
- justificativa obrigatória;
- quantidade adotada;
- reconstrução determinística do passo.

### Componentes

- stepper;
- CTAs habilitados/desabilitados;
- upload failure sem perda de draft;
- ausência de dados extraídos durante processamento;
- divergência sem decisão pré-selecionada;
- justificativa vazia bloqueando confirmação.

### Banco/integração

- criação e atualização de draft;
- documento/evidência no mesmo escopo;
- RPC rejeita movimento não draft ou não receipt;
- RPC aceita `registered_only` sem documento;
- RPC aceita `keep_registered` com justificativa válida;
- RPC aceita `use_document` com evidência processada;
- `draft → posted` cria uma única entrada no ledger;
- segunda confirmação não duplica estoque;
- falha transacional não produz estoque parcial;
- RLS e permissões continuam válidas.

### Regressão funcional

1. 480 kg, sem documento, confirmar com valor registrado;
2. 480 kg, documento processando, confirmar sem inventar extração;
3. 480 kg × 482 kg, usar 482 kg;
4. 480 kg × 482 kg, manter 480 kg com justificativa;
5. upload falha e é repetido;
6. upload falha e operador continua sem documento;
7. refresh em Dados/Comprovação/Conferência e retomada correta;
8. movimento `posted` não reabre para edição.

## 19. Critérios de aceite

O incremento só está concluído quando:

- REC-03A até REC-05 são reproduzíveis por rotas/estados;
- o shell permanece aderente ao VERDIS UI SYSTEM V1.1;
- processamento saudável não gera pendência;
- dados documentais nunca sobrescrevem silenciosamente dados registrados;
- divergência exige decisão explícita;
- manter valor registrado exige justificativa no caminho homologado;
- confirmação é atômica;
- estoque muda somente no `posted`;
- original permanece preservado;
- refresh/reentrada preserva a operação;
- unit tests, typecheck, build e database tests passam no CI.

## 20. Fora de escopo

- fluxo profundo de Vendas;
- mobile;
- provedor final de OCR/IA de produção;
- SINIR/MTR/CDF;
- auditoria ambiental/legal;
- assinatura digital;
- upload global fora de uma movimentação;
- dashboards ESG expandidos.

## 21. Decisão final do design

O fluxo profundo de Recebimentos será um vertical slice persistente sobre o domínio existente. Estados efêmeros ficam na UI; fatos duráveis ficam em `movements`, `documents`, `document_extractions`, `evidences` e `validations`.

`confirm_receipt_m1(...)` é a fronteira atômica de confirmação. O estoque continua derivado exclusivamente da transição `draft → posted` e dos triggers já existentes.
