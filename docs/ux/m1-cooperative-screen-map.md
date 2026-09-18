# VERDIS M1 Cooperative Pilot — Screen Map

Status: **homologado para desktop no Stitch em 15/09/2026**.

## 1. Objetivo

Inventariar todas as telas e variantes visuais aprovadas para o núcleo operacional da Cooperativa. Este mapa serve como contrato de cobertura para implementação, testes e homologação.

## 2. Navegação principal

Shell global:

- Início;
- Recebimentos;
- Estoque;
- Vendas;
- Documentos;
- Pendências.

O item ativo muda conforme a página. O restante do shell permanece idêntico.

## 3. Início

### IN-01 — Início / Dashboard Operacional

Objetivo: dar visão rápida da operação do dia e acesso às duas ações centrais.

Elementos homologados:

- `+ RECEBER MATERIAL`;
- `+ REGISTRAR VENDA`;
- resumo do dia;
- pendências prioritárias;
- estoque em atenção/estoque atual conforme variante homologada;
- atividades recentes;
- acesso a rastreabilidade e operação.

A implementação deve usar o Master V1.1, não reproduzir variações antigas de shell geradas pelo Stitch.

## 4. Recebimentos

### REC-01 — Recebimentos / Visão Geral

Conteúdo:

- resumo de recebimentos;
- busca e filtros;
- lista de recebimentos;
- status documental;
- CTA `+ RECEBER MATERIAL`;
- ação `ABRIR`/`ABRIR DETALHE` conforme componente canônico.

### REC-02 — Detalhe / Rastreabilidade do Recebimento

Exemplo homologado: `Recebimento #1284`.

Conteúdo:

- material;
- quantidade;
- origem;
- data/hora;
- documento vinculado;
- histórico da movimentação;
- dados da operação;
- efeito no estoque;
- identificador operacional;
- rastreabilidade.

### REC-03A — Novo Recebimento / Dados

Stepper: `1 Dados` ativo.

Dados principais:

- origem;
- material;
- peso/quantidade;
- data e hora;
- resumo lateral;
- `CONTINUAR`.

### REC-03B — Comprovação / Estado Vazio

Stepper: `2 Comprovação` ativo.

Ações:

- `TIRAR FOTO`;
- `ENVIAR ARQUIVO`;
- `CONTINUAR SEM DOCUMENTO`.

### REC-03C — Comprovação / Arquivo Selecionado

Estado:

- arquivo escolhido;
- `Pronto para enviar`;
- `ENVIAR DOCUMENTO` como ação principal;
- `CONTINUAR` desabilitado até envio.

### REC-03D — Comprovação / Enviando

Estado:

- progresso de upload;
- ações temporariamente bloqueadas;
- `ENVIANDO...`.

### REC-03E — Comprovação / Documento Enviado — Processando

Estado:

- envio concluído;
- processamento em andamento;
- operador pode continuar;
- apenas `VISUALIZAR DOCUMENTO` após preservação do original.

### REC-03F — Comprovação / Falha no Envio

Estado:

- `Falha no envio`;
- `TENTAR NOVAMENTE`;
- `Trocar arquivo`;
- `Tirar outra foto`;
- `CONTINUAR SEM DOCUMENTO`.

### REC-04A — Conferência / Documento Ainda Processando

Stepper: `3 Conferência` ativo.

Regra:

- não inventar dados extraídos;
- operador pode confirmar com os dados registrados;
- processamento continua em segundo plano.

### REC-04B — Conferência / Documento Processado — Divergência de Peso

Exemplo homologado:

- informado: `480 kg`;
- documento: `482 kg`;
- diferença: `+2 kg / +0,42%`;
- decisões: `USAR 482 KG` ou `MANTER 480 KG`;
- nenhuma opção pré-selecionada;
- nenhuma recomendação automática.

### REC-04C — Conferência / Justificativa da Divergência

Aparece quando o operador escolhe manter o valor registrado.

Regra:

- justificativa obrigatória;
- preservar valor informado, valor documental, diferença, decisão e justificativa;
- `CONFIRMAR RECEBIMENTO` desabilitado enquanto justificativa estiver vazia.

### REC-05 — Recebimento Concluído

Conteúdo:

- recebimento confirmado;
- peso efetivamente registrado;
- documento e estado documental;
- divergência e decisão quando houver;
- estoque atualizado;
- rastreabilidade;
- `VER MOVIMENTAÇÃO`;
- `RECEBER OUTRO MATERIAL`.

## 5. Estoque

### EST-01 — Estoque / Visão Geral

Conteúdo:

- estoque total;
- materiais com saldo;
- entradas hoje;
- saídas hoje;
- filtros;
- lista de materiais;
- saldos derivados das movimentações;
- `ABRIR DETALHE`.

Regra: não permitir edição manual de saldo nesta tela.

### EST-02 — Detalhe do Material / Papelão Ondulado

Conteúdo:

- saldo atual;
- entradas no período;
- saídas no período;
- última movimentação;
- filtros do histórico;
- histórico de entradas e saídas;
- `ABRIR MOVIMENTAÇÃO`.

Regra: o saldo deve ser explicável pelas movimentações registradas.

## 6. Vendas

### VEN-01 — Vendas / Visão Geral

Conteúdo homologado:

- vendido hoje;
- saídas hoje;
- material vendido hoje;
- documentos pendentes;
- filtros;
- lista de vendas;
- material, quantidade, comprador, preço/kg, valor total e estado documental;
- CTA `+ REGISTRAR VENDA`.

Resumo demonstrativo homologado deve ser matematicamente coerente com os registros mostrados na mesma tela.

### VEN-02A — Registrar Venda / Dados

Stepper: `1 Dados` ativo.

Dados principais:

- material;
- saldo disponível;
- quantidade;
- saldo projetado;
- comprador;
- preço/kg;
- valor total;
- resumo lateral.

Regra: o estoque ainda não é reduzido.

### VEN-02B — Registrar Venda / Saldo Insuficiente

Exemplo homologado:

- saldo: `320 kg`;
- quantidade: `400 kg`;
- `Saldo após venda: Indisponível`;
- `CONTINUAR` desabilitado.

Regra: nunca apresentar saldo negativo como resultado permitido.

### VEN-03A — Comprovação / Estado Vazio

Ações:

- `TIRAR FOTO`;
- `ENVIAR ARQUIVO`;
- `CONTINUAR SEM DOCUMENTO`.

### VEN-03B — Comprovação / Arquivo Selecionado

Estado:

- documento selecionado;
- `Pronto para enviar`;
- `ENVIAR DOCUMENTO`;
- `CONTINUAR` desabilitado.

### VEN-03C — Comprovação / Enviando

Estado:

- upload em andamento;
- progresso;
- ações temporariamente bloqueadas.

### VEN-03D — Comprovação / Documento Enviado — Processando

Estado:

- arquivo original preservado;
- processamento em segundo plano;
- `CONTINUAR` ativo;
- `VISUALIZAR DOCUMENTO`.

### VEN-03E — Comprovação / Falha no Envio

Estado:

- `Falha no envio`;
- `TENTAR NOVAMENTE`;
- `Trocar arquivo`;
- `Tirar outra foto`;
- `CONTINUAR SEM DOCUMENTO`.

### VEN-04A — Conferência / Documento Ainda Processando

Regra:

- dados registrados visíveis;
- dados documentais ainda indisponíveis;
- operador pode confirmar a venda sem esperar a interpretação;
- documento segue processando.

### VEN-04B — Conferência / Documento Processado — Dados Coincidentes

Comparações homologadas:

- quantidade registrada × documento;
- comprador registrado × documento;
- preço/kg registrado × documento;
- valor total registrado × documento.

Estado: `Sem diferença` quando os campos coincidem.

### VEN-04C — Conferência / Divergência Documental

Exemplo homologado:

- quantidade: `1.000 kg = 1.000 kg`;
- comprador: `Comprador Demo = Comprador Demo`;
- preço/kg: `R$ 3,10 ≠ R$ 3,20`;
- valor total: `R$ 3.100,00 ≠ R$ 3.200,00`;
- diferença total: `+ R$ 100,00 (+3,23%)`.

Decisões:

- `USAR VALORES DO DOCUMENTO`;
- `MANTER VALORES REGISTRADOS`.

Preço/kg e valor total devem ser tratados como par matematicamente consistente.

### VEN-04D — Conferência / Justificativa da Divergência

Aparece quando o operador mantém os valores registrados.

Regra:

- justificativa obrigatória;
- preservar dados registrados, dados documentais, diferenças e decisão;
- `CONFIRMAR VENDA` desabilitado enquanto justificativa estiver vazia.

### VEN-05 — Venda Concluída

Conteúdo:

- venda confirmada;
- material, quantidade, comprador, preço/kg e valor final;
- estoque atualizado;
- documento processado;
- divergência, decisão e justificativa quando houver;
- rastreabilidade;
- `VER MOVIMENTAÇÃO`;
- `REGISTRAR OUTRA VENDA`.

Exemplo homologado de estoque:

`3.200 kg → -1.000 kg → 2.200 kg`.

## 7. Pendências

### PEN-01 — Pendências / Central Operacional

Princípio: pendência existe quando é necessária ação humana.

Conteúdo:

- pendências abertas;
- documentos ausentes;
- divergências;
- resolvidas hoje;
- filtros;
- lista `REQUER SUA AÇÃO`.

Exemplos homologados:

- Venda #1279 sem documento → `ANEXAR DOCUMENTO`;
- Recebimento #1282 sem comprovante → `ANEXAR DOCUMENTO`;
- divergência documental aguardando decisão → `RESOLVER`.

Documento processando normalmente não vira pendência por si só.

## 8. Documentos

### DOC-01 — Documentos / Visão Geral

Princípio: documento é arquivo existente vinculado a uma movimentação.

Conteúdo:

- documentos vinculados;
- processados;
- processando;
- com pendência;
- filtros;
- lista de arquivos;
- movimentação relacionada;
- material/contexto;
- status;
- `VISUALIZAR`;
- `ABRIR MOVIMENTAÇÃO`.

Não existe upload global no M1. `Sem documento` pertence a Pendências, não à biblioteca de Documentos.

## 9. Cobertura mínima de implementação

Uma implementação M1 desktop só pode ser considerada visualmente completa quando todas as telas acima existirem ou estiverem representadas por componentes/rotas equivalentes e todos os estados relevantes puderem ser reproduzidos em testes.

## 10. Regra de precedência

Em caso de divergência:

1. regras de domínio e interação têm precedência sobre screenshots isolados;
2. `VERDIS UI SYSTEM V1.1` tem precedência sobre variações visuais antigas do Stitch;
3. screenshots homologados definem composição e hierarquia de cada tela;
4. dados demonstrativos não devem ser promovidos a regra de negócio.
