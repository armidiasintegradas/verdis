# VERDIS M1 — Fluxo Profundo de Recebimentos

Status: **design técnico proposto para revisão**.

Data: 16/09/2026

## 1. Objetivo

Implementar o fluxo profundo de Recebimentos do M1 Cooperative Pilot como um vertical slice persistente sobre a arquitetura existente, preservando o contrato visual do VERDIS UI SYSTEM V1.1 e as máquinas de estado homologadas no Stitch.

O fluxo deve cobrir:

`Dados → Comprovação → Conferência → Decisão/Justificativa → Concluir`

com persistência real de movimento, documento, evidência, decisão humana e efeito de estoque.

## 2. Princípios obrigatórios

1. O recebimento nasce como `movement` em estado `draft`.
2. O upload de documento nunca pode apagar ou invalidar o rascunho do movimento.
3. O arquivo original deve ser preservado no bucket privado `evidence-documents` e registrado em `documents`.
4. A interpretação do documento é assíncrona e não pode sobrescrever silenciosamente o valor informado pelo operador.
5. `Documento processado` e `divergência operacional` são dimensões independentes.
6. Uma divergência exige decisão humana explícita.
7. Quando o operador mantém o valor originalmente registrado no cenário homologado de divergência, uma justificativa é obrigatória.
8. Somente a transição `draft → posted` produz efeito de estoque.
9. A confirmação deve ser atômica no banco.
10. Estados transitórios de interface não devem ser promovidos a fatos persistentes desnecessários.

## 3. Abordagem escolhida

### Vertical slice persistente com Supabase real

A implementação deve reutilizar as estruturas existentes em vez de criar uma segunda camada paralela de protótipo.

Responsabilidades:

- `movements`: movimento operacional e quantidade efetivamente adotada;
- `documents`: identidade e preservação do arquivo original;
- `document_extractions`: histórico append-only da interpretação automática;
- `evidences`: vínculo entre movimento e documento, com valores declarados e extraídos;
- `validations`: decisão humana e justificativa;
- `stock_ledger_entries`: efeito de estoque gerado somente após `posted`.

Não criar tabela específica para cada passo visual do wizard.

## 4. Componentes de aplicação

### 4.1 ReceiptFlow

Responsabilidade: coordenar a jornada de UI.

Passos:

- Dados;
- Comprovação;
- Conferência;
- Concluir.

Não acessa SQL diretamente e não contém regra de estoque.

### 4.2 ReceiptDraftService

Responsabilidade:

- criar `movement` com `movement_type = receipt` e `status = draft`;
- atualizar os campos editáveis enquanto o movimento permanece `draft`;
- nunca marcar o movimento como `posted`.

### 4.3 EvidenceUploadService

Responsabilidade:

- calcular SHA-256 do arquivo;
- enviar o arquivo ao bucket privado `evidence-documents`;
- criar a linha correspondente em `documents`;
- criar/ligar `evidence` ao movimento;
- preservar o rascunho do movimento em qualquer falha de upload.

### 4.4 ReceiptConferenceService

Responsabilidade: montar um view model de conferência sem tomar decisão pelo operador.

Estados derivados:

- `processing`;
- `match`;
- `divergence`.

Deve comparar fatos registrados e documentais quando estes realmente existirem.

### 4.5 ConfirmReceiptService

Responsabilidade: única porta de efetivação do recebimento.

Deve chamar uma operação transacional no banco que:

1. valide escopo e permissão;
2. confirme que o movimento é `receipt` e está em `draft`;
3. valide a decisão humana, se houver divergência;
4. exija justificativa quando a decisão for manter o valor registrado no cenário aplicável;
5. registre `validation` humana;
6. atualize a quantidade adotada quando o operador escolher o valor documental;
7. altere o movimento para `posted`;
8. deixe o trigger existente produzir o lançamento em `stock_ledger_entries`;
9. retorne movimento confirmado e saldo resultante.

## 5. Modelo de divergência

Exemplo homologado:

- quantidade registrada: `480 kg`;
- quantidade documental: `482 kg`;
- diferença absoluta: `+2 kg`;
- diferença percentual: `+0,42%`.

Nenhuma opção deve iniciar selecionada.

### 5.1 Persistência conceitual

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

### 5.2 Decisão: manter 480 kg

- `movements.quantity_kg` permanece `480`;
- `validations` registra a decisão;
- justificativa é obrigatória no cenário homologado;
- depois da decisão válida, o movimento passa para `posted`.

### 5.3 Decisão: usar 482 kg

Na mesma transação de confirmação:

1. atualizar o draft para `482`;
2. registrar a decisão humana;
3. alterar para `posted`.

O valor original `480` continua preservado em `evidences.claimed_fields`.

## 6. RPC transacional de confirmação

Criar uma função transacional dedicada, com nome final definido no plano de implementação. Nome de referência:

`confirm_receipt_m1(...)`

Entrada mínima conceitual:

- `movement_id`;
- decisão (`use_document` | `keep_registered` | `registered_only`);
- `evidence_id` quando aplicável;
- justificativa quando obrigatória.

Comportamento obrigatório:

- falha inteira se qualquer pré-condição falhar;
- não deixar movimento parcialmente alterado;
- não lançar estoque mais de uma vez;
- não permitir segunda confirmação de movimento já `posted`;
- não aceitar quantidade documental sem evidência processada correspondente;
- não aceitar justificativa vazia quando obrigatória.

## 7. Estados de documento

Os estados canônicos de UI permanecem:

```text
NONE
SELECTED
UPLOADING
UPLOADED_PROCESSING
PROCESSED
UPLOAD_FAILED
PENDING_EVIDENCE
```

### Persistência

Não persistir `SELECTED`, percentual de upload ou erro momentâneo de rede como estados de domínio.

Persistir fatos duráveis:

- arquivo armazenado;
- documento registrado;
- evidência vinculada;
- extração concluída;
- decisão humana;
- ausência de documento quando resultar em pendência operacional.

## 8. Rotas e retomada segura

Rota base proposta:

`/recebimentos/novo/:movementId`

Passo atual representado em query string:

- `?step=dados`;
- `?step=comprovacao`;
- `?step=conferencia`;
- `?step=concluir`.

O `movementId` é a âncora persistente da jornada.

### 8.1 Refresh do navegador

Ao recarregar a página, a UI deve reconstruir o estado a partir de fatos persistidos.

Regras:

- `draft` sem documento → retomar no último passo operacional seguro;
- documento armazenado sem extração concluída → mostrar estado `Processando`;
- extração concluída com divergência e sem decisão → abrir Conferência / Divergência;
- decisão que exige justificativa ainda não concluída → abrir Justificativa;
- movimento `posted` → não permitir reedição; redirecionar para conclusão/detalhe.

### 8.2 Upload interrompido

Se o refresh ocorrer antes de o arquivo ter sido efetivamente preservado, a UI volta ao estado seguro anterior e não inventa um documento.

Se o registro em `documents` já existir, o arquivo é considerado preservado e pode continuar em processamento.

## 9. Comportamento por passo

### 9.1 Dados

Campos homologados:

- origem;
- material;
- quantidade/peso;
- data/hora.

Ao avançar:

- criar ou atualizar `movement` em `draft`;
- não alterar estoque.

### 9.2 Comprovação — vazio

Ações:

- `TIRAR FOTO`;
- `ENVIAR ARQUIVO`;
- `CONTINUAR SEM DOCUMENTO`.

### 9.3 Arquivo selecionado

Estado local:

- nome/tipo/tamanho;
- `Pronto para enviar`;
- `ENVIAR DOCUMENTO` habilitado;
- `CONTINUAR` normal desabilitado enquanto o caminho documental escolhido não foi enviado.

### 9.4 Enviando

- mostrar progresso disponível;
- bloquear ações conflitantes;
- não permitir duplicação de upload.

### 9.5 Documento enviado / Processando

- arquivo original já preservado;
- `VISUALIZAR DOCUMENTO` disponível;
- processamento pode continuar em segundo plano;
- operador pode avançar conforme contrato homologado;
- não permitir remover/trocar o original neste estado no M1.

### 9.6 Falha de upload

- manter rascunho intacto;
- `TENTAR NOVAMENTE`;
- trocar arquivo;
- tirar outra foto;
- continuar sem documento;
- não mostrar erro técnico de storage/API na UI operacional.

### 9.7 Conferência / Processando

- mostrar apenas os dados registrados;
- não fabricar valores extraídos;
- permitir confirmação com os dados registrados quando a regra homologada permitir.

### 9.8 Conferência / Divergência

- mostrar registrado, documental, diferença absoluta e percentual;
- nenhuma opção pré-selecionada;
- `USAR 482 KG` e `MANTER 480 KG` no exemplo homologado;
- continuar desabilitado até decisão explícita.

### 9.9 Justificativa

Quando exigida:

- textarea obrigatória;
- `CONFIRMAR RECEBIMENTO` desabilitado enquanto vazia ou inválida;
- preservar todos os valores da divergência na tela.

### 9.10 Conclusão

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

## 10. Tratamento de erros

### Validação de formulário

Erro exibido junto ao campo, sem perder rascunho.

### Upload

Falha não altera movimento nem estoque.

### Extração

Falha de interpretação nunca remove o documento original.

Quando exigir ação humana, pode originar pendência específica sem marcar processamento saudável como pendência.

### Confirmação

Falha transacional significa:

- movimento permanece `draft`;
- nenhuma entrada parcial de estoque;
- nenhuma decisão parcialmente efetivada.

## 11. Segurança e autorização

Reutilizar:

- `AuthProvider`;
- `ScopeProvider`;
- RLS existente;
- permissões `movement.create`, `movement.read`, `movement.correct`, `evidence.upload`, `evidence.read` conforme aplicável.

Não duplicar autenticação ou autorização no componente de página.

O RPC de confirmação deve verificar autorização no banco e não confiar apenas no estado do frontend.

## 12. Estoque

O frontend nunca insere diretamente em `stock_ledger_entries`.

Efeito esperado:

```text
saldo anterior + quantidade adotada = novo saldo
```

O trigger existente em `movements` continua sendo a única origem do lançamento automático quando ocorre `draft → posted`.

## 13. Pendências

O fluxo pode produzir pendência somente quando houver ação humana necessária.

Exemplos:

- recebimento confirmado sem documento;
- upload falhou e foi abandonado sem resolução, quando aplicável ao fluxo;
- divergência aguardando decisão;
- justificativa obrigatória pendente.

Não criar pendência apenas porque um documento está sendo processado normalmente.

## 14. Reutilização futura em Vendas

Devem ser desenhados para reutilização:

- máquina de upload;
- documento preservado;
- processamento assíncrono;
- conferência;
- comparação registrado × documental;
- decisão humana;
- justificativa;
- retomada do wizard;
- tratamento de erros.

Recebimentos continua responsável apenas pelas regras específicas de entrada e quantidade.

Vendas adicionará posteriormente:

- saldo disponível;
- bloqueio por saldo insuficiente;
- preço/kg;
- valor total;
- comprador;
- comparação comercial coerente.

## 15. Estratégia de testes

### Unidade

Testar:

- cálculo de diferença absoluta e percentual;
- derivação `processing | match | divergence`;
- regra de justificativa obrigatória;
- seleção da quantidade adotada;
- reconstrução do passo a partir do estado persistido.

### Componentes

Testar:

- stepper;
- CTA habilitado/desabilitado;
- upload failure sem perda do rascunho;
- ausência de dados extraídos enquanto processando;
- divergência sem decisão pré-selecionada;
- justificativa vazia bloqueando confirmação.

### Integração / banco

Testar:

- criação de draft;
- preservação de documento e evidência no mesmo escopo;
- RPC rejeita confirmação inválida;
- RPC aceita `keep_registered` com justificativa válida;
- RPC aceita `use_document` com evidence processada;
- `draft → posted` cria uma única entrada no ledger;
- segunda confirmação não duplica estoque;
- falha transacional não produz estoque parcial;
- RLS/permission checks continuam válidos.

### Regressão funcional

Cenários mínimos:

1. 480 kg, sem documento, confirmar com dado registrado;
2. 480 kg, documento processando, confirmar sem inventar extração;
3. 480 kg × 482 kg, usar 482 kg;
4. 480 kg × 482 kg, manter 480 kg com justificativa;
5. upload falha, tentar novamente;
6. upload falha, continuar sem documento;
7. refresh durante o fluxo e retomada do estado correto;
8. acesso a movimento já `posted` não permite edição.

## 16. Critérios de aceite

O incremento só pode ser considerado concluído quando:

- todas as telas REC-03A até REC-05 do Screen Map estiverem representadas por rotas/estados reproduzíveis;
- o shell continuar obedecendo ao VERDIS UI SYSTEM V1.1;
- nenhum processamento saudável gerar pendência indevida;
- dados documentais nunca sobrescreverem silenciosamente dados registrados;
- divergência exigir decisão explícita;
- justificativa for obrigatória no caminho homologado de manutenção do valor registrado;
- confirmação for atômica;
- estoque mudar somente no `posted`;
- o arquivo original permanecer preservado;
- refresh/reentrada não destruir o rascunho;
- testes unitários, typecheck, build e database tests passarem no CI.

## 17. Fora de escopo deste incremento

- fluxo profundo de Vendas;
- mobile;
- OCR/provider final de produção;
- classificação sofisticada de documentos;
- SINIR/MTR/CDF;
- auditoria ambiental/legal;
- assinatura digital;
- upload global fora de uma movimentação;
- dashboards ESG expandidos.

## 18. Decisão final do design

O fluxo profundo de Recebimentos será implementado como um vertical slice persistente sobre o domínio existente, com UI state local apenas para transições efêmeras e fatos duráveis persistidos em `movements`, `documents`, `document_extractions`, `evidences` e `validations`.

A confirmação será a única fronteira que efetiva estoque, executada de forma transacional e compatível com os triggers já existentes.
