# Verdis M1 — Stitch Cooperative Pilot

**Contexto:** M1 — Cooperative Pilot  
**Fonte de verdade:** `docs/product/PRD.md`, `docs/superpowers/specs/2026-09-15-verdis-core-foundation-design.md`, `docs/superpowers/specs/2026-09-15-verdis-m1-cooperative-pilot-design.md`  
**Objetivo:** gerar a experiência visual e responsiva do piloto operacional da cooperativa sem alterar regras de domínio.  
**Não alterar:** marca oficial Verdis, escopo da M1, lógica de estoque, Evidence Engine, estados de validação, permissões ou contratos do backend.  
**Critério de aceite:** todas as telas e estados abaixo formam uma experiência coerente em desktop, tablet e mobile e podem ser implementados diretamente no app React existente.

---

## Prompt mestre para o Stitch

Crie a experiência UX/UI da **VERDIS — Plataforma Integrada de Gestão da Circularidade e Impacto Socioambiental**, especificamente para o módulo **Cooperativa / M1 Cooperative Pilot**.

A Verdis transforma a operação diária da reciclagem em dados rastreáveis e comprováveis. Nesta experiência, o usuário não deve sentir que está preenchendo um dashboard ESG. Ele deve sentir que está usando uma ferramenta operacional simples para registrar recebimentos, vender materiais, consultar estoque e resolver pendências. Evidências, validações, rastreabilidade e auditoria acontecem em segundo plano.

### Princípio de produto

`REGISTRO → EVIDÊNCIA → VALIDAÇÃO → AÇÃO`

O usuário registra o trabalho que já realiza. A plataforma converte esse trabalho em informação confiável.

### Perfil principal

Usuário de cooperativa de reciclagem em ambiente operacional real: gestor ou operador, usando desktop no administrativo, tablet no galpão e celular para captura rápida de documentos. A interface precisa funcionar com baixa fricção, boa legibilidade e decisões simples.

### Navegação oficial da M1

Use exatamente esta arquitetura principal:

`Início | Recebimentos | Estoque | Vendas | Documentos | Pendências`

Ações primárias da home:

`+ RECEBER MATERIAL`

`+ REGISTRAR VENDA`

Não adicionar Financeiro, Associados, ESG, Água, Energia, Carbono, PGRS ou outros módulos nesta proposta.

### Direção visual

A aparência deve ser profissional, clara, humana, contemporânea e operacional. Priorize tipografia altamente legível, hierarquia forte, números grandes quando representam operação, botões primários amplos e componentes fáceis de tocar. Use cards apenas quando ajudam agrupamento e leitura. Evite estética de BI/fintech, excesso de gráficos, gradientes decorativos, glassmorphism, excesso de sombras ou telas carregadas.

A marca oficial Verdis deve ser tratada como ativo imutável: não redesenhar, não reinterpretar e não gerar um novo logotipo. Se o ativo oficial não estiver disponível dentro do Stitch, reservar a área correta para aplicação posterior do arquivo oficial.

Cores, tipografia, raio, espaçamento e iconografia devem formar um sistema coerente, mas não devem competir com a informação operacional. Estados não podem depender somente de cor; sempre combine cor, ícone e texto quando houver alerta ou status.

### Tela 01 — Home Cooperativa / Desktop

Construir uma home que responda imediatamente: **“o que eu preciso fazer agora?”**

Estrutura de referência:

```text
[marca]                         [escopo/unidade] [usuário]

Bom dia, Maria
Cooperativa Demo

[ + RECEBER MATERIAL ]   [ + REGISTRAR VENDA ]

HOJE
Recebido hoje       2.480 kg
Vendido hoje        R$ 4.820
Estoque atual       18.420 kg
Pendências          3

PENDÊNCIAS PRIORITÁRIAS
Divergência de peso — Recebimento #1284
Documento ausente — Venda #1279
Ticket aguardando conferência — #009182

ESTOQUE EM ATENÇÃO
Papelão     8.420 kg
PET         3.200 kg
PEAD        2.100 kg
Alumínio      780 kg
```

A home não deve parecer um dashboard executivo. Os indicadores devem funcionar como resumo operacional e pontos de entrada.

### Tela 02 — Home Cooperativa / Mobile

Criar versão mobile realmente operacional. `Receber material` e `Registrar venda` devem estar imediatamente acessíveis. Priorizar uma coluna, números legíveis e pendências acionáveis. Navegação mobile pode usar barra inferior, menu compacto ou outro padrão desde que mantenha as seis áreas principais compreensíveis e não esconda as ações essenciais.

### Tela 03 — Receber Material / Origem e material

Criar um fluxo em etapas curtas.

Etapa:

```text
RECEBER MATERIAL

1. DE ONDE VEIO?
[ selecionar origem / contraparte ]

2. O QUE CHEGOU?
[ material ]
[ peso em kg ]
[ data/hora ]

[ Continuar ]
```

Não solicitar tenant, organization, unit, created_by ou qualquer identificador técnico.

### Tela 04 — Receber Material / Comprovar

```text
3. COMPROVAR

[ Tirar foto do ticket ]
[ Enviar arquivo ]

ou

[ Continuar sem documento ]
```

Explicar de forma curta que o documento ajuda a comprovar a operação. Não usar jargões como Evidence Engine.

Mostrar estados de upload: selecionado, enviando, enviado, falha e nova tentativa.

### Tela 05 — Conferência de documento

Comparar claramente dado informado e dado extraído.

Exemplo:

```text
CONFERIR RECEBIMENTO

Papelão
Origem: Empresa Demo

Peso informado       520 kg
Peso identificado    482 kg
Diferença              38 kg

Ticket #009182
Data identificada: 15/09/2026
Placa identificada: ABC1D23

[ Usar peso do ticket ]
[ Manter 520 kg ]
```

Se o usuário mantiver o peso informado com divergência, mostrar campo obrigatório de justificativa curta antes de continuar.

Não definir tolerância automática nem dizer que 38 kg é aceitável ou inaceitável.

### Tela 06 — Recebimento concluído

```text
RECEBIMENTO REGISTRADO

Papelão
480 kg
Origem: Empresa Demo

Comprovação
Documento verificado

Saldo atualizado do material
+480 kg

[ Ver movimentação ]
[ Receber outro material ]
```

Também prever versão autodeclarada quando o usuário conclui sem documento. Nesse caso usar linguagem como `Sem documento — comprovação pendente`, nunca “validado”.

### Tela 07 — Estoque / visão geral

```text
ESTOQUE

18.420 kg

Papelão        8.420 kg
PET             3.200 kg
PEAD            2.100 kg
Alumínio          780 kg
```

Permitir busca/filtro simples por material e unidade quando aplicável. Não oferecer edição direta de saldo. Cada material abre seu detalhe.

### Tela 08 — Detalhe do material

Mostrar saldo atual, entradas, saídas e uma linha temporal simples das últimas movimentações. Permitir entender de onde veio o saldo. Documentos relacionados podem aparecer como referências da movimentação, sem transformar a tela em GED.

### Tela 09 — Registrar Venda

Fluxo simples:

```text
REGISTRAR VENDA

Material
Quantidade
Comprador
Preço por kg
Documento/NF opcional
```

Antes de confirmar mostrar:

```text
Disponível             3.200 kg
Venda                  1.000 kg
Saldo estimado         2.200 kg
Preço/kg               R$ 3,10
Valor total            R$ 3.100,00
```

Botão: `CONFIRMAR VENDA`.

Criar também estado de saldo insuficiente:

```text
Saldo insuficiente
Disponível: 320 kg
Venda informada: 400 kg
Ajuste a quantidade para continuar.
```

Nesse estado o botão de confirmação deve ficar indisponível.

### Tela 10 — Venda concluída

Confirmar material, quantidade, comprador, valor e novo saldo. Se não houver documento, deixar explícito que há uma pendência documental, sem impedir que a venda operacional registrada seja visualizada.

### Tela 11 — Pendências / lista

Criar uma central operacional enxuta, não um sistema de chamados.

Exemplos:

```text
Divergência de peso
Recebimento #1284
Informado: 520 kg · Ticket: 482 kg
[ Abrir e conferir ]

Sem documento
Venda #1279 · PET · 1.200 kg
[ Anexar documento ]

Aguardando processamento
Ticket #009182
[ Abrir ]
```

Permitir filtros simples por tipo/status, sem criar complexidade de ticketing.

### Tela 12 — Pendência / detalhe

A tela precisa responder:

- o que aconteceu;
- qual registro foi afetado;
- o que está faltando ou divergente;
- qual ação resolve;
- qual efeito isso tem na comprovação.

Sempre uma ação primária clara.

### Tela 13 — Documentos

Lista operacional com tipo, nome/identificador, data, movimentação associada, status de processamento/revisão e eventual alerta. Permitir abrir o documento original conforme permissão. Não mostrar caminho técnico de Storage.

### Tela 14 — Movimentação / rastreabilidade

Criar uma visão narrativa da operação, não uma tabela técnica.

Exemplo de timeline:

```text
15/09 · 14:32
Recebimento criado
Papelão · 480 kg · Empresa Demo

15/09 · 14:34
Ticket anexado
#009182

15/09 · 14:35
Documento processado
Peso identificado: 480 kg

15/09 · 14:36
Recebimento confirmado
+480 kg no estoque
```

Incluir nível de comprovação em linguagem compreensível e informações relevantes de pesagem, documentos, validações, venda/estoque quando aplicável.

### Tela 15 — Estados transversais

Para as principais telas, desenhar também estados de:

- carregamento;
- vazio;
- salvando rascunho;
- enviando documento;
- documento em processamento;
- falha de upload;
- falha de interpretação do documento;
- falta de permissão;
- estoque insuficiente;
- operação concluída.

A interface nunca deve representar sucesso enquanto a ação ainda está processando.

### Responsividade

Entregar referências para três classes:

- desktop;
- tablet;
- mobile.

No mobile, formulários devem ser confortáveis para uso em pé/no galpão. Alvos de toque amplos, labels permanentes e inputs numéricos fáceis de operar. Não depender de hover.

### Acessibilidade

Usar contraste adequado, foco visível, labels explícitos, mensagens de erro textuais e hierarquia semântica clara. Evitar usar apenas verde/vermelho para comunicar estado.

### Conteúdo fictício permitido para protótipo

Use somente como demonstração visual:

- Cooperativa Demo;
- Empresa Demo;
- Maria;
- Papelão, PET, PEAD, Alumínio;
- estoque total 18.420 kg;
- 480 kg;
- divergência 520 kg versus 482 kg;
- PET 1.000 kg a R$ 3,10/kg.

Esses dados são fictícios e não devem ser tratados como métricas reais da Verdis.

### Entrega esperada do Stitch

Produza uma linguagem visual única para todas as telas e, ao final, apresente:

1. as 15 telas/estados principais;
2. comportamento desktop/tablet/mobile;
3. hierarquia de navegação;
4. componentes recorrentes;
5. estados de botões, formulários, alertas e processamento;
6. tokens visuais sugeridos (tipografia, espaçamento, raio, cores de interface), separados da marca oficial;
7. observações necessárias para implementação React.

Não gerar código de backend, banco, regras de autorização ou regras de validação. O Stitch é responsável pela experiência visual; o GitHub continua sendo a fonte da verdade funcional.