# VERDIS UI SYSTEM V1.1 — Master Reference

Status: **canônico, consolidado e congelado para o M1 Cooperative Pilot**.

## 1. Objetivo

Este documento traduz para o repositório o Master Reference homologado no Stitch em 15/09/2026. Ele é o contrato visual e terminológico da interface M1 da Cooperativa.

O objetivo é impedir que novas telas, componentes ou implementações criem variações de marca, shell, tipografia, cores, estados ou vocabulário.

Regra central:

> Toda nova tela M1 deve herdar o mesmo sistema visual. O conteúdo muda; o sistema não.

## 2. Fonte de verdade visual

A referência visual primária continua sendo o frame **VERDIS UI SYSTEM V1.1 — MASTER REFERENCE** homologado no Stitch.

Este documento fixa as regras sem inventar medidas que não estejam explicitamente registradas no código. Na implementação, cores, dimensões, radii, spacing e tipografia devem ser copiados do Master homologado e convertidos em tokens reutilizáveis; não devem ser aproximados arbitrariamente.

## 3. Marca

Marca canônica para o M1:

`verdis.`

Não utilizar no shell M1:

- monogramas inventados;
- iniciais de usuário como marca;
- `V.`;
- `VERDIS OPERAÇÃO RURAL`;
- `Gestão Agro`;
- `Gestão de Circularidade`;
- assinaturas paralelas de produto.

## 4. Shell global canônico

O shell é único para todas as páginas do M1.

### 4.1 Sidebar

Estrutura fixa:

- `verdis.`;
- `AMBIENTE: M1 COOPERATIVE PILOT`;
- Início;
- Recebimentos;
- Estoque;
- Vendas;
- Documentos;
- Pendências;
- rodapé com avatar genérico, `Maria`, `Gestora` e configurações.

Apenas um item pode estar ativo. O estado ativo usa o verde primário Verdis com texto e ícone de alto contraste.

Nenhum módulo pode criar sidebar própria.

### 4.2 Header

Estrutura fixa:

- Unidade Operacional;
- `Cooperativa Demo · M1 Pilot`;
- `OPERAÇÃO ATIVA · GALPÃO 01`;
- busca `Buscar na Verdis`;
- notificações;
- avatar genérico;
- `Maria — Gestora`;
- `Sessão conectada`.

Nenhuma tela pode omitir, duplicar ou reinterpretar esses blocos sem uma decisão formal posterior de produto.

### 4.3 Avatar

Enquanto não houver foto real de perfil, usar apenas avatar genérico com ícone de pessoa.

Não usar iniciais, monogramas ou fotos fictícias.

## 5. Breadcrumb

Um único componente deve ser reutilizado.

Exemplos homologados:

- `INÍCIO / ESTOQUE`;
- `INÍCIO / ESTOQUE / PAPELÃO ONDULADO`;
- `INÍCIO / VENDAS`;
- `INÍCIO / VENDAS / NOVA VENDA`;
- `INÍCIO / DOCUMENTOS`;
- `INÍCIO / PENDÊNCIAS`.

O breadcrumb é navegação contextual; não é título de página.

## 6. Hierarquia tipográfica

A implementação deve mapear a tipografia do Master para níveis semânticos reutilizáveis:

- Display / Page Title;
- Section Title;
- Card Title;
- Body;
- Label;
- Metadata;
- Button;
- Badge.

Não criar uma escala tipográfica diferente por módulo.

## 7. Paleta semântica

Os tokens visuais devem ser organizados por função, não por tela:

- `primary`: verde Verdis para ações e seleção;
- `positive-surface`: verde claro discreto;
- `background`: base clara/neutra;
- `surface`: branco/neutro para cards;
- `text-primary`;
- `text-secondary`;
- `border`;
- `success`;
- `attention`;
- `error`;
- `disabled`.

Regra: verde claro não é o background predominante da aplicação. A base permanece neutra; verde é reservado a identidade, ação, seleção e estados.

## 8. Cards e superfícies

Uma única família de cards deve servir a todos os módulos.

Variantes semânticas permitidas:

- Default Card;
- Summary Card;
- Operational Card;
- Attention Card;
- Error Card;
- Success Card.

Todos devem derivar dos mesmos tokens de superfície, borda, radius, padding e spacing.

## 9. Botões

Componentes canônicos:

- Primary Button;
- Secondary Button;
- Tertiary/Text Action;
- Danger Action;
- Disabled Button;
- Icon Button.

Exemplos:

- `CONTINUAR`, `CONFIRMAR VENDA`, `ANEXAR DOCUMENTO` → Primary;
- `VOLTAR`, `VISUALIZAR` → Secondary;
- ações destrutivas só usam Danger quando houver destruição real.

Saída de estoque não é erro e não deve usar vermelho por padrão.

## 10. Inputs

Componentes canônicos:

- Text Input;
- Search Input;
- Numeric Input;
- Select;
- Date Input;
- Textarea;
- Upload;
- Invalid Input;
- Disabled Input.

Recebimentos, Vendas, filtros e justificativas devem usar exatamente a mesma família.

## 11. Stepper

Stepper compartilhado por Recebimento e Venda:

1. Dados
2. Comprovação
3. Conferência
4. Concluir

Estados:

- future;
- active;
- completed.

Não criar stepper alternativo para operações semelhantes.

## 12. Badges e estados

### Neutro

- Rascunho.

### Positivo

- Confirmado;
- Documento processado;
- Justificativa registrada.

### Processamento

- Processando;
- Em andamento.

### Atenção

- Documento pendente;
- Sem documento;
- Divergência identificada;
- Justificativa pendente.

### Erro/Bloqueio

- Falha no envio;
- Saldo insuficiente.

Cores não podem contradizer a semântica do estado.

## 13. Estados documentais canônicos

Vocabulário congelado para M1:

1. Nenhum documento;
2. Pronto para enviar;
3. Enviando;
4. Documento enviado;
5. Processando;
6. Documento processado;
7. Falha no envio.

Evitar sinônimos entre telas.

`Documento processado` significa apenas que a interpretação terminou. Não significa autenticidade, auditoria, certificação ou validade jurídica.

## 14. Terminologia de estoque

Vocabulário permitido:

- Saldo atual;
- Saldo disponível;
- Saldo projetado;
- Saldo após confirmação;
- Entrada;
- Saída;
- Novo saldo.

Não usar no M1:

- posição líquida;
- estoque homologado;
- estoque validado;
- estoque consolidado como status.

Entrada pode receber destaque positivo discreto. Saída é uma operação normal e não deve ser vermelha por ser negativa.

## 15. Pendências

Princípio congelado:

> Pendência = ação humana necessária.

Não criar pendência apenas porque:

- um documento está processando normalmente;
- uma movimentação está concluída;
- existe processamento assíncrono sem intervenção humana necessária.

## 16. Documentos

Princípio congelado:

> Documento = arquivo existente vinculado a uma movimentação.

`Sem documento` não é documento. É uma pendência da movimentação.

No M1 não existe upload global de documento órfão de contexto.

## 17. Rastreabilidade

Linguagem permitida:

- dados registrados;
- documento original;
- dados identificados;
- diferenças;
- decisão humana;
- justificativa;
- movimentação de estoque.

Não utilizar como status de produto no M1:

- auditado;
- certificado;
- 100% conforme;
- autenticidade garantida;
- validado juridicamente.

## 18. Iconografia

Usar uma única família visual, com espessura, escala e proporção consistentes.

Ícones devem apoiar função ou estado, não decorar a interface.

## 19. Densidade e tom

A Verdis M1 deve parecer:

- operacional;
- limpa;
- profissional;
- leve;
- legível.

Não transformar a experiência em dashboard financeiro, ERP industrial pesado ou interface promocional.

## 20. Regra de implementação

Durante a implementação no Antigravity:

- criar tokens centrais antes de criar páginas;
- criar o shell global uma única vez;
- criar componentes reutilizáveis antes de duplicar UI;
- páginas não podem introduzir novos tokens sem revisão;
- qualquer divergência entre screenshot individual e Master V1.1 deve ser resolvida a favor do Master V1.1;
- regras de negócio não podem ser inferidas de aparência visual; devem vir dos contratos de domínio e interação.

## 21. Vocabulário proibido no M1 sem regra explícita

Não introduzir automaticamente:

- auditado;
- certificado;
- conforme;
- recomendado;
- fraude;
- score de risco;
- tolerância automática;
- homologado como estado de contraparte;
- sincronização em tempo real garantida;
- capacidade/teto/meta de estoque inventados;
- balança, lote, pesagem ou equipamento quando não fizerem parte do caso de uso implementado.

## 22. Governança

Qualquer mudança estrutural neste documento exige revisão explícita do Master Reference e atualização da versão.

Até nova decisão, `VERDIS UI SYSTEM V1.1` é a referência canônica para o M1 Cooperative Pilot.
