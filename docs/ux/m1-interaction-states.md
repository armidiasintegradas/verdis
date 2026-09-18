# VERDIS M1 — Interaction States

Status: **contrato funcional de interação do M1 Cooperative Pilot**.

## 1. Objetivo

Consolidar as máquinas de estado e regras de transição homologadas no Stitch para evitar que a implementação trate telas como imagens isoladas.

A interface deve refletir fatos do domínio, estados assíncronos e decisões humanas sem perder histórico.

## 2. Princípios globais

### 2.1 A interface não inventa evidência

Se um documento ainda está processando, campos extraídos ainda não existem para a UI. Não mostrar dados documentais fictícios.

### 2.2 Processamento assíncrono não bloqueia a operação por padrão

Depois que o arquivo original foi enviado e preservado, a interpretação pode continuar em segundo plano. O operador pode avançar quando a regra do fluxo permitir.

### 2.3 Confirmação operacional e comprovação documental são dimensões diferentes

Uma movimentação pode ser confirmada com comprovação pendente. Isso não torna a movimentação inexistente.

### 2.4 Decisão humana é explícita

Quando há divergência entre o registrado e o documento, a Verdis:

- mostra os dois valores;
- calcula a diferença;
- registra a decisão;
- exige justificativa quando o operador decide manter o valor original em um caminho que assim foi homologado;
- não altera silenciosamente o dado canônico.

### 2.5 Estoque deriva de movimentações confirmadas

Valores de saldo projetado não produzem efeito até a confirmação final da operação.

## 3. Estados documentais

Máquina de estado canônica:

```text
NONE
  ├─ select file/photo → SELECTED
  └─ continue without document → PENDING_EVIDENCE

SELECTED
  ├─ upload → UPLOADING
  ├─ replace/remove → NONE ou SELECTED
  └─ continue without document → PENDING_EVIDENCE

UPLOADING
  ├─ success → UPLOADED_PROCESSING
  └─ failure → UPLOAD_FAILED

UPLOAD_FAILED
  ├─ retry → UPLOADING
  ├─ replace/photo → SELECTED
  └─ continue without document → PENDING_EVIDENCE

UPLOADED_PROCESSING
  └─ extraction finished → PROCESSED

PROCESSED
  └─ available to conference/reconciliation
```

Mapeamento de UI:

| Estado lógico | Texto canônico |
|---|---|
| NONE | Nenhum documento |
| SELECTED | Pronto para enviar |
| UPLOADING | Enviando |
| UPLOADED_PROCESSING | Documento enviado + Processando |
| PROCESSED | Documento processado |
| UPLOAD_FAILED | Falha no envio |
| PENDING_EVIDENCE | Documento pendente / Sem documento |

## 4. Regras do upload

### NONE

Ações possíveis:

- Tirar foto;
- Enviar arquivo;
- Continuar sem documento.

### SELECTED

Ações:

- Enviar documento;
- Trocar arquivo;
- Tirar outra foto;
- Remover antes do envio;
- Continuar sem documento.

`CONTINUAR` normal permanece desabilitado até o envio quando o operador escolheu o caminho documental.

### UPLOADING

Ações de alteração ficam temporariamente bloqueadas para evitar envio duplicado ou inconsistência.

Não permitir navegação normal enquanto o upload está em trecho crítico, conforme componente homologado.

### UPLOADED_PROCESSING

O arquivo original foi preservado.

Ações permitidas:

- Visualizar documento;
- Voltar;
- Continuar.

Não oferecer remover/trocar/tirar outra foto neste estado no M1.

### UPLOAD_FAILED

Ações:

- Tentar novamente;
- Trocar arquivo;
- Tirar outra foto;
- Continuar sem documento.

Não mostrar detalhes técnicos de HTTP, storage ou API.

## 5. Recebimento — máquina de estado

```text
DRAFT_DATA
  → EVIDENCE
  → CONFERENCE
  → CONFIRMED
```

### DRAFT_DATA

Campos necessários para o protótipo homologado:

- origem;
- material;
- quantidade/peso;
- data/hora.

### EVIDENCE

Usa a máquina documental global.

### CONFERENCE / DOCUMENT_PROCESSING

Documento enviado, interpretação pendente.

A UI mostra apenas dados registrados e o status do documento.

O operador pode confirmar o recebimento com os dados registrados.

### CONFERENCE / DIVERGENCE

Exemplo homologado:

- registrado: 480 kg;
- documento: 482 kg;
- diferença: +2 kg / +0,42%.

Nenhuma opção começa selecionada.

Opções:

- usar valor do documento;
- manter valor registrado.

Se mantiver valor registrado, seguir para justificativa.

### JUSTIFICATION

Justificativa obrigatória.

Enquanto vazia:

- CTA de confirmação desabilitado.

Após preenchimento válido:

- CTA habilitado.

### CONFIRMED

Somente neste estado ocorre efeito final de estoque.

A tela final preserva:

- valor registrado;
- valor documental;
- diferença;
- decisão;
- justificativa;
- documento;
- novo saldo.

## 6. Venda — máquina de estado

```text
DRAFT_DATA
  → EVIDENCE
  → CONFERENCE
  → CONFIRMED
```

### DRAFT_DATA

Campos:

- material;
- saldo disponível;
- quantidade;
- comprador;
- preço/kg;
- valor total.

O valor total é calculado por:

`quantidade × preço/kg`.

### SALDO INSUFICIENTE

Condição:

`quantidade > saldo disponível`.

Comportamento:

- input em estado inválido;
- `Saldo após venda: Indisponível`;
- não calcular/exibir saldo negativo como resultado permitido;
- `CONTINUAR` desabilitado;
- não produzir efeito em estoque.

### EVIDENCE

Usa a máquina documental global.

### CONFERENCE / DOCUMENT_PROCESSING

Documento enviado, processamento ainda em andamento.

A venda pode ser confirmada com os dados registrados. O processamento continua em segundo plano.

Uma confirmação feita antes do fim do processamento nunca deve ser reescrita silenciosamente por extração posterior.

### CONFERENCE / MATCH

Campos comparados:

- quantidade;
- comprador;
- preço/kg;
- valor total.

Quando coincidem, mostrar `Sem diferença` por campo e manter a decisão final com o operador.

### CONFERENCE / DIVERGENCE

Exemplo homologado:

- quantidade: 1.000 kg = 1.000 kg;
- comprador: Comprador Demo = Comprador Demo;
- preço/kg: R$ 3,10 ≠ R$ 3,20;
- valor total: R$ 3.100,00 ≠ R$ 3.200,00;
- diferença total: +R$ 100,00 / +3,23%.

Decisões:

- usar valores do documento;
- manter valores registrados.

Preço/kg e valor total formam um par coerente e não podem ser combinados de forma matematicamente contraditória.

### JUSTIFICATION

Quando o operador mantém os valores registrados no cenário de divergência homologado:

- justificativa obrigatória;
- CTA `CONFIRMAR VENDA` desabilitado até justificativa válida.

### CONFIRMED

Somente aqui a saída de estoque se torna efetiva.

Exemplo homologado:

`3.200 kg - 1.000 kg = 2.200 kg`.

A tela final preserva dados registrados, documentais, diferença, decisão, justificativa e efeito de estoque.

## 7. Estoque

### Saldo atual

É projeção dos lançamentos derivados de movimentações válidas/confirmadas.

### Saldo projetado

É simulação usada antes da confirmação de uma operação. Não afeta o saldo real.

### Atualização

Recebimento confirmado:

`saldo novo = saldo anterior + quantidade confirmada`.

Venda confirmada:

`saldo novo = saldo anterior - quantidade confirmada`.

Não existe edição direta de saldo nas telas M1 homologadas.

## 8. Pendências

Criação de pendência requer ação humana.

Casos M1:

- documento ausente;
- falha de upload que não foi resolvida;
- divergência aguardando decisão;
- justificativa pendente.

Não gerar pendência apenas por:

- processamento documental normal;
- operação já concluída sem ação humana restante.

Resolução da pendência acontece quando a ação necessária é concluída; o histórico permanece associado à movimentação.

## 9. Documentos

Um documento entra na biblioteca quando existe um arquivo preservado e vinculado a uma movimentação.

Estados visíveis na visão geral M1:

- Processando;
- Documento processado.

Movimentação sem documento não gera item fictício em Documentos.

## 10. Regras dos CTAs

### CTA primário

Representa a próxima ação operacional principal.

Exemplos:

- CONTINUAR;
- CONFIRMAR RECEBIMENTO;
- CONFIRMAR VENDA;
- ENVIAR DOCUMENTO;
- TENTAR NOVAMENTE;
- ANEXAR DOCUMENTO;
- RESOLVER.

### CTA desabilitado

Deve refletir condição objetiva, por exemplo:

- quantidade acima do saldo;
- nenhuma decisão selecionada em divergência;
- justificativa obrigatória vazia;
- arquivo selecionado ainda não enviado no caminho documental.

Não desabilitar sem motivo funcional legível.

## 11. Regra de não sobrescrita

Dados provenientes de documento não devem apagar o valor originalmente informado.

Persistir conceitualmente:

- original registrado;
- valor extraído/documental;
- diferença;
- decisão;
- justificativa quando houver;
- valor efetivamente adotado.

## 12. Regra de tempo

Distinguir pelo menos:

- data/hora da operação;
- data/hora do registro;
- data/hora de upload;
- data/hora de processamento;
- data/hora de decisão/validação quando aplicável.

A UI M1 não precisa exibir todas simultaneamente, mas a implementação não deve colapsá-las em um único timestamp.

## 13. Critérios de teste

A implementação deve ter testes que comprovem, no mínimo:

- upload pode falhar sem perder os dados do rascunho;
- processamento pode continuar em segundo plano;
- venda não permite saldo negativo;
- confirmação é o momento de efeito de estoque;
- divergência exige decisão explícita;
- caminho de manutenção de valor exige justificativa quando definido;
- documentos ausentes aparecem em Pendências, não em Documentos;
- processamento normal não gera Pendência automaticamente.
