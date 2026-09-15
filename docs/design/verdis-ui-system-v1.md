# VERDIS UI SYSTEM V1

Data: 2026-09-15  
Status: baseline visual aprovada para a M1 — Cooperative Pilot

## 1. Objetivo

O VERDIS UI SYSTEM V1 é o contrato visual global da plataforma Verdis. Ele existe para impedir que telas, módulos e experiências futuras sejam tratados como produtos visuais independentes.

Todas as interfaces devem parecer parte do mesmo sistema, criadas pela mesma equipe e sob a mesma identidade.

Aplica-se a:

- Cooperativas;
- Empresas;
- Eventos;
- Gestão Pública;
- Central Verdis;
- desktop;
- tablet;
- mobile;
- páginas internas;
- formulários;
- dashboards operacionais;
- estados de loading, vazio, erro e permissão.

## 2. Referências canônicas

As referências visuais canônicas iniciais da V1 são as telas aprovadas no Stitch para:

1. Home Cooperativa;
2. Recebimentos;
3. Recebimento / Rastreabilidade;
4. Receber Material — Etapa 1 Dados;
5. Receber Material — Etapa 2 Comprovação e variantes;
6. Receber Material — Etapa 3 Conferência e variantes;
7. Recebimento Concluído.

Novas telas devem reutilizar o mesmo sistema. Não começar visualmente do zero.

## 3. Marca

A marca oficial Verdis é imutável.

Regras:

- nunca redesenhar ou reinterpretar a marca;
- nunca criar monogramas como `rd`, `vd`, `rc` ou similares;
- nunca gerar novo símbolo por IA;
- usar apenas o ativo oficial;
- quando o ativo oficial não estiver disponível no protótipo, reservar o espaço e usar placeholder textual neutro `verdis.` sem inventar símbolo alternativo;
- não usar descritores incorretos como `Gestão Agro`, `Operação Rural` ou `Governança Agrícola`.

## 4. Usuário / avatar

Hierarquia obrigatória:

1. foto real do perfil, quando disponível;
2. avatar genérico com ícone de pessoa/user-circle;
3. nunca inventar iniciais ou monogramas.

O mesmo padrão deve ser utilizado no header e em qualquer área de perfil.

## 5. Linguagem visual

Direção aprovada:

- interface clara, operacional, profissional e humana;
- fundo muito claro e superfícies brancas/neutras;
- verde Verdis como cor funcional principal;
- alto contraste para títulos e números;
- cards com baixa densidade, respiro e cantos arredondados;
- iconografia linear consistente;
- sombras discretas ou inexistentes;
- evitar estética de BI/fintech, glassmorphism, neon, gradientes decorativos e excesso de gráficos.

## 6. Tipografia

Usar a mesma família e hierarquia tipográfica das telas canônicas.

A escala deve permanecer consistente para:

- Page Title;
- Section Title;
- Card Title;
- Body;
- Label;
- Caption;
- Metadata.

Nenhuma tela futura pode introduzir nova família ou escala tipográfica sem revisão do UI System.

Os valores exatos de família, peso, tamanho, line-height e letter-spacing devem ser capturados do arquivo/export visual aprovado antes da implementação final. Não inventar valores a partir de screenshots.

## 7. Cores

A paleta deve ser tratada por função semântica:

- Brand Primary;
- Brand Primary Dark;
- Brand Primary Light;
- Background Base;
- Surface Primary;
- Surface Secondary;
- Text Primary;
- Text Secondary;
- Text Muted;
- Border Subtle;
- Success;
- Warning;
- Danger;
- Information.

O mesmo estado deve usar o mesmo tratamento em todas as telas.

Os valores exatos de cor devem ser extraídos da referência aprovada/export antes da implementação, não inferidos manualmente.

## 8. Estrutura desktop

A estrutura canônica usa:

- sidebar persistente;
- header global;
- seletor de unidade/contexto;
- busca global `Buscar na Verdis`;
- área principal alinhada em grid consistente;
- card lateral de resumo quando o fluxo exige contexto persistente.

Sidebar, header e eixos de alinhamento são globais e não devem ser redesenhados por módulo.

## 9. Navegação

M1 Cooperativa:

`Início | Recebimentos | Estoque | Vendas | Documentos | Pendências`

No mobile, a mesma arquitetura pode ser reorganizada em bottom navigation, sem criar outro produto visual.

## 10. Componentes globais

Famílias iniciais:

- Primary Action Card;
- Metric Card;
- Summary Card;
- Alert / Pending Card;
- Stock Material Card;
- Document Card;
- Movement Row;
- Timeline Event;
- Status Badge;
- Upload Area;
- Stepper;
- Empty State;
- Error State;
- Bottom Navigation;
- Desktop Sidebar;
- Global Header;
- Active Unit Selector;
- Primary / Secondary / Ghost / Danger Button;
- Text / Number / Select / Date / Textarea / Upload Input.

Novos componentes devem ser criados somente quando não existir equivalente reutilizável.

## 11. Estados

Estados operacionais devem ser consistentes e textuais, nunca apenas por cor.

Exemplos:

- Rascunho;
- Enviado;
- Processando;
- Documento processado;
- Sem documento;
- Divergência de peso;
- Confirmado;
- Falha no envio.

`Validado`, `Auditado`, `Certificado` e `Conforme` só podem aparecer quando o backend realmente sustentar esses estados.

## 12. Regras de UX do fluxo de recebimento

O fluxo aprovado segue:

`Dados → Comprovação → Conferência → Concluir`

Princípios congelados:

- operação não pode ficar bloqueada esperando processamento documental;
- upload concluído e processamento concluído são estados distintos;
- a Verdis apresenta informado × identificado × diferença;
- a Verdis não recomenda automaticamente qual valor escolher;
- se o operador mantiver valor divergente, justificativa é obrigatória;
- o histórico preserva valor informado, valor documental, diferença, decisão e justificativa;
- estoque é consequência da movimentação confirmada e não pode ser editado diretamente.

## 13. Responsividade

Desktop, tablet e mobile compartilham o mesmo domínio visual.

Pode mudar:

- grid;
- número de colunas;
- posição da navegação;
- densidade de layout.

Não pode mudar:

- identidade;
- tipografia;
- paleta;
- estilo de cards;
- botões;
- inputs;
- iconografia;
- linguagem de status.

## 14. Proibições globais

Não introduzir sem decisão explícita:

- nova marca;
- nova fonte;
- novos verdes/cinzas arbitrários;
- nova sidebar;
- novo header;
- novos raios/sombras desconectados da baseline;
- nova biblioteca de ícones;
- integração SINIR/MTR/CDF fictícia;
- balança/equipamento presumido;
- gestão de turnos, lotes, cooperados ou RH não previstos;
- métricas, metas, capacidades ou certificações inventadas.

## 15. Autoridade visual

Ordem de autoridade para implementação:

`PRD → Core Foundation Design → M1 Cooperative Pilot Design → VERDIS UI SYSTEM V1 → Stitch homologado → plano técnico → código`

Quando houver conflito visual, o VERDIS UI SYSTEM V1 e as telas Stitch homologadas prevalecem sobre improvisações do Antigravity.

## 16. Regra para prompts futuros no Stitch

Todo novo pedido deve começar com:

> Use obrigatoriamente o VERDIS UI SYSTEM V1. Não altere nenhum token, componente ou padrão visual global. Crie apenas a nova tela/estado solicitado.

## 17. Regra para Antigravity

O Antigravity deve implementar o sistema visual aprovado, não reinterpretá-lo. Qualquer diferença material de tipografia, paleta, espaçamento, grid, componente ou estado precisa voltar para revisão antes de virar padrão permanente.
