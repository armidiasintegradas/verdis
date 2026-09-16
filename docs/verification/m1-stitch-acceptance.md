# VERDIS M1 — Stitch Acceptance Record

Data do checkpoint: **15/09/2026**

Status: **desktop do núcleo operacional da Cooperativa homologado para implementação**.

## 1. Escopo homologado

O checkpoint cobre o M1 Cooperative Pilot nas seguintes áreas:

- Início;
- Recebimentos;
- Estoque;
- Vendas;
- Documentos;
- Pendências;
- VERDIS UI SYSTEM V1.1 — Master Reference.

## 2. Sistema visual

Aprovado e congelado:

- marca `verdis.`;
- sidebar canônica;
- header canônico;
- avatar genérico;
- breadcrumb;
- tipografia e hierarquia;
- paleta semântica;
- cards;
- botões;
- inputs;
- stepper;
- badges/status;
- estados documentais;
- regras de uso de atenção/erro;
- terminologia de estoque;
- princípios de Pendências e Documentos.

Contrato correspondente:

- `docs/ux/verdis-ui-system-v1.1.md`.

## 3. Recebimentos

Homologados:

- visão geral;
- detalhe/rastreabilidade;
- novo recebimento / Dados;
- Comprovação vazia;
- arquivo selecionado;
- enviando;
- documento enviado/processando;
- falha no envio;
- Conferência com documento ainda processando;
- Conferência com divergência;
- decisão humana;
- justificativa obrigatória;
- Recebimento Concluído;
- atualização final de estoque.

Regras verificadas:

- documento processando não inventa valores;
- divergência preserva registrado e documento;
- decisão não é recomendada automaticamente;
- justificativa é exigida no caminho homologado de manutenção do valor registrado;
- estoque só é atualizado na confirmação final.

## 4. Estoque

Homologados:

- visão geral;
- detalhe do material;
- saldo atual;
- entradas;
- saídas;
- histórico;
- acesso às movimentações.

Regras verificadas:

- saldo deriva de movimentações;
- sem edição manual de saldo na UI M1;
- saída não é representada automaticamente como erro;
- não existem capacidade/meta/teto inventados.

## 5. Vendas

Homologados:

- visão geral;
- Dados;
- saldo insuficiente;
- Comprovação vazia;
- arquivo selecionado;
- enviando;
- documento enviado/processando;
- falha no envio;
- Conferência com documento ainda processando;
- Conferência com dados coincidentes;
- Conferência com divergência comercial;
- decisão humana;
- justificativa obrigatória;
- Venda Concluída;
- baixa final de estoque.

Regras verificadas:

- quantidade > saldo bloqueia avanço;
- saldo negativo não é apresentado como operação válida;
- saldo projetado não afeta estoque antes da confirmação;
- preço/kg e valor total divergentes são tratados como conjunto coerente;
- documento não sobrescreve silenciosamente valor registrado;
- estoque só é reduzido na confirmação final.

## 6. Pendências

Homologada a Central Operacional.

Regras verificadas:

- pendência significa ação humana necessária;
- documento ausente pode gerar pendência;
- divergência aguardando decisão pode gerar pendência;
- processamento assíncrono saudável não gera pendência automaticamente;
- ações são específicas (`ANEXAR DOCUMENTO`, `RESOLVER`, etc.), não genéricas.

## 7. Documentos

Homologada a visão geral.

Regras verificadas:

- biblioteca contém apenas arquivos existentes;
- cada arquivo é vinculado a uma movimentação;
- `Sem documento` não vira documento fictício;
- não existe upload global órfão de movimentação no M1;
- status principais: `Processando` e `Documento processado`;
- ações: `VISUALIZAR` e `ABRIR MOVIMENTAÇÃO`.

## 8. Itens explicitamente fora deste checkpoint

Ainda não homologados neste ciclo:

- experiência mobile final;
- Empresas;
- Eventos;
- Gestão Pública;
- Central Verdis interna completa;
- viewer documental completo;
- integrações legais externas;
- SINIR/MTR/CDF;
- financeiro completo;
- contas a receber;
- compliance expandido;
- ESG expandido;
- automações avançadas de IA.

## 9. Critério de implementação

A implementação só deve ser considerada aderente ao Stitch quando respeitar simultaneamente:

- `docs/architecture/domain-model.md`;
- `docs/ux/verdis-ui-system-v1.1.md`;
- `docs/ux/m1-cooperative-screen-map.md`;
- `docs/ux/m1-interaction-states.md`;
- `docs/ux/m1-antigravity-implementation-contract.md`.

Screenshots individuais não substituem os contratos acima.

## 10. Resultado do checkpoint

**M1 Cooperative Pilot — Desktop Core: HOMOLOGADO PARA IMPLEMENTAÇÃO.**

Próxima etapa recomendada: plano de implementação incremental no app React/Vite existente, com componentes do UI System antes das páginas de negócio e validação por testes + comparação visual.
