# M1 Stitch Acceptance — Cooperative Pilot

Data: 2026-09-15  
Status: homologação visual parcial — fluxo de Recebimento aprovado

## 1. Objetivo

Registrar oficialmente as decisões visuais aprovadas no Stitch para a M1 — Cooperative Pilot e impedir que a implementação no Antigravity reinterprete o produto.

## 2. Baseline visual aprovada

O projeto deve seguir o `VERDIS UI SYSTEM V1`, documentado em:

`docs/design/verdis-ui-system-v1.md`

A Home Cooperativa, Recebimentos e Rastreabilidade formam a base visual canônica da M1.

## 3. Fluxo de Recebimento homologado

Sequência aprovada:

`Etapa 1 Dados → Etapa 2 Comprovação → Etapa 3 Conferência → Etapa 4 Concluir`

### 3.1 Etapa 1 — Dados

Aprovado:

- origem;
- material;
- peso recebido;
- data/hora;
- resumo lateral;
- status `Rascunho`;
- CTA `Continuar`.

Regras:

- sem bruto/tara/equipamento presumido;
- sem IDs técnicos;
- busca global `Buscar na Verdis`;
- avatar genérico quando não houver foto real.

### 3.2 Etapa 2 — Comprovação

Estados aprovados:

- 02A — nenhum documento anexado;
- 02B — arquivo selecionado;
- 02C — enviando documento;
- 02D — documento enviado / processando;
- 02E — falha no envio.

Regras congeladas:

- upload e processamento são estados independentes;
- o operador pode continuar enquanto o documento é processado;
- arquivo original não deve ser tratado como descartável após preservação;
- falha de upload não deve apagar o arquivo selecionado localmente quando possível;
- `Continuar sem documento` permanece permitido e gera comprovação pendente.

### 3.3 Etapa 3 — Conferência

Estados aprovados:

- 03A — documento ainda processando;
- 03B — documento processado com comparação;
- 03C — justificativa da divergência.

Regras congeladas:

- nunca inventar dados extraídos antes do processamento terminar;
- comparar `informado × identificado no documento × diferença`;
- não aplicar tolerância automática;
- não classificar divergência como fraude, erro ou não conformidade automaticamente;
- nenhuma escolha deve vir pré-selecionada;
- a Verdis não recomenda automaticamente qual valor usar;
- manter o valor informado diante de divergência exige justificativa;
- histórico preserva ambos os valores e a decisão humana.

Cenário visual homologado de demonstração:

- informado: 480 kg;
- identificado: 482 kg;
- diferença: +2 kg / +0,42%;
- decisão: manter 480 kg;
- justificativa registrada.

Os números são fictícios de protótipo, não métricas reais.

### 3.4 Etapa 4 — Recebimento concluído

Aprovado:

- título `Recebimento registrado`;
- stepper completamente concluído;
- material, origem, data/hora e peso efetivamente registrado;
- bloco `Estoque atualizado`;
- saldo anterior, entrada e novo saldo;
- bloco de comprovação;
- preservação da divergência e decisão;
- justificativa registrada;
- acesso à rastreabilidade;
- ações `Ver movimentação` e `Receber outro material`.

Cenário visual homologado:

- saldo anterior: 7.940 kg;
- entrada: +480 kg;
- novo saldo: 8.420 kg.

Esses valores são conteúdo fictício de protótipo.

## 4. Regras de marca e perfil homologadas

Marca:

- somente ativo oficial Verdis;
- placeholder textual `verdis.` é aceito no Stitch enquanto o ativo oficial não estiver inserido;
- nenhum monograma alternativo é permitido.

Usuário:

- foto real quando disponível;
- caso contrário, avatar genérico com ícone de pessoa;
- não gerar iniciais automaticamente.

## 5. Elementos removidos / proibidos

Não devem ser reintroduzidos no fluxo aprovado:

- `Gestão Agro`;
- `Operação Rural`;
- `Governança Agrícola`;
- `SINIR/MTR sincronizado` sem integração real;
- `balança conectada` presumida;
- `turno` como módulo funcional;
- `lote` sem contrato de domínio aprovado;
- `cooperados/guias` na busca da M1;
- peso bruto/tara nesta etapa;
- certificações ou conformidade inventadas;
- recomendação automática de qual peso escolher.

## 6. Componentes visuais aprovados no fluxo

- desktop sidebar;
- global header;
- active unit selector;
- global search;
- stepper 4 etapas;
- summary side card;
- upload/document card;
- progress/loading state;
- warning/divergence card;
- comparison cards;
- decision cards/radio selection;
- textarea de justificativa;
- stock update card;
- status badges;
- primary/secondary/disabled buttons.

## 7. Pendências visuais ainda não homologadas

Ainda precisam passar pelo mesmo processo no Stitch:

- Estoque geral;
- Detalhe do material;
- Registrar Venda;
- Venda concluída;
- Pendências;
- Detalhe de pendência;
- Documentos;
- detalhe/visualização de documento;
- mobile completo;
- tablet;
- estados vazios/erro/sem permissão fora do fluxo de Recebimento.

## 8. Gate para Antigravity

O fluxo de Recebimento pode ser usado como referência de implementação somente se:

- `VERDIS UI SYSTEM V1` for respeitado;
- nenhuma regra visual for reinterpretada;
- nenhuma funcionalidade fictícia do Stitch for transformada em requisito de backend;
- dados de demonstração forem substituídos por dados reais do Core;
- estados do frontend forem vinculados aos estados canônicos do backend.

## 9. Próximo passo de design

Seguir no Stitch com:

`Estoque → Detalhe do material → Registrar Venda → Venda concluída → Pendências → Documentos → Mobile/Tablet`

mantendo integralmente o `VERDIS UI SYSTEM V1`.
