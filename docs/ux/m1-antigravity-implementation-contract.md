# VERDIS M1 — Antigravity Implementation Contract

Status: **contrato obrigatório para implementação do M1 Cooperative Pilot**.

## 1. Objetivo

Este documento define o que o Antigravity pode implementar, o que deve reutilizar e o que não pode reinterpretar ao transformar as telas homologadas do Stitch em aplicação real.

O Antigravity não recebe liberdade para redesenhar o produto. Ele recebe um domínio, um contrato de interação e um sistema visual já aprovados.

## 2. Fontes de verdade

Ordem de precedência:

1. regras de domínio em `docs/architecture/`;
2. `docs/ux/m1-interaction-states.md`;
3. `docs/ux/verdis-ui-system-v1.1.md`;
4. `docs/ux/m1-cooperative-screen-map.md`;
5. telas homologadas no Stitch;
6. conteúdo demonstrativo de screenshots.

Se um screenshot contradizer uma regra de domínio ou estado documentado, prevalece o contrato escrito.

## 3. Stack existente — não substituir silenciosamente

O repositório já utiliza:

- React 19;
- TypeScript 5.9;
- Vite 7;
- Supabase JS 2;
- TanStack React Query 5;
- Zod 4;
- Vitest 3;
- Testing Library;
- pnpm workspace.

A implementação deve evoluir essa base. Não migrar para Next.js, outro framework, outro backend ou outro gerenciador de pacotes sem decisão explícita.

## 4. Estrutura existente — preservar responsabilidades

Estrutura já existente em `apps/web/src`:

- `app/` — composição da aplicação/providers;
- `domain/` — tipos e regras de domínio;
- `features/` — capacidades de produto;
- `lib/` — infraestrutura compartilhada;
- `services/` — operações e integração;
- `test/` — suporte de teste.

Novos arquivos devem seguir essas fronteiras em vez de concentrar toda a M1 em um único componente.

## 5. Providers existentes

A aplicação já possui:

- `AuthProvider`;
- `ScopeProvider`;
- TanStack Query;
- boundary de sessão;
- boundary de escopo.

A implementação do shell M1 deve integrar esses providers. Não duplicar autenticação ou seleção de escopo dentro das páginas.

## 6. Primeira obrigação de UI

Antes de implementar páginas de negócio, criar componentes e tokens reutilizáveis do `VERDIS UI SYSTEM V1.1`.

No mínimo:

- AppShell;
- Sidebar;
- Header;
- Breadcrumb;
- PageHeader;
- Stepper;
- Button variants;
- Input family;
- Select;
- Textarea;
- Badge/Status;
- MetricCard;
- SummaryCard;
- OperationalCard;
- Alert;
- DocumentCard;
- MovementRow;
- PendingItem;
- generic avatar.

Não copiar markup e estilos entre páginas para simular consistência.

## 7. Tokens

Criar uma camada central de tokens para:

- cores semânticas;
- tipografia;
- spacing;
- radii;
- borders;
- heights;
- z-index quando necessário.

Os valores devem ser extraídos do Master Reference homologado no Stitch. Não aproximar visualmente por conta própria.

Nenhuma feature pode declarar uma segunda paleta ou um segundo shell.

## 8. Navegação

O shell M1 possui:

- Início;
- Recebimentos;
- Estoque;
- Vendas;
- Documentos;
- Pendências.

A solução de routing deve ser definida no plano de implementação e integrada à aplicação atual. Não criar navegação falsa baseada apenas em estado local de uma página quando rotas reais forem necessárias.

## 9. Dados demonstrativos

Valores presentes nos screenshots são fixtures de UX, não defaults de produção.

Exemplos:

- `Empresa Demo`;
- `Comprador Demo`;
- `Papelão Ondulado`;
- `PET`;
- `480 kg`;
- `3.200 kg`;
- `R$ 3,10/kg`.

Fixtures podem existir em testes e ambientes de demonstração, mas regras de negócio não podem depender desses valores.

## 10. Movimentação como fonte operacional

Recebimentos e vendas devem produzir/usar Movements conforme o domínio existente.

Estoque não é um número editável na interface. Deve ser derivado das movimentações/lançamentos autorizados.

A UI pode exibir saldo projetado antes da confirmação, mas o saldo real só muda quando a regra de domínio confirmar a operação.

## 11. Regra de documentos

O arquivo original deve ser preservado e vinculado à movimentação.

A interface deve modelar separadamente:

- seleção local;
- upload;
- upload concluído;
- processamento;
- processamento concluído;
- falha de upload;
- ausência de documento.

`Documento processado` não significa `validado`, `auditado`, `certificado` ou `conforme`.

## 12. Processamento assíncrono

Depois de upload concluído, o processamento documental pode continuar em segundo plano.

A implementação deve permitir que o usuário avance quando o contrato de interação permitir, sem falsificar resultados de extração.

Quando o processamento terminar depois de uma operação já confirmada, ele pode atualizar o estado de comprovação/pendência, mas não pode reescrever silenciosamente a decisão ou os dados adotados da movimentação.

## 13. Divergências

Persistir e apresentar separadamente:

- valor registrado;
- valor identificado no documento;
- diferença absoluta/percentual quando aplicável;
- decisão humana;
- justificativa quando exigida;
- valor adotado.

A implementação não deve reduzir a divergência a um único campo sobrescrito.

## 14. Recebimentos

O fluxo implementado deve suportar:

- Dados;
- Comprovação;
- Conferência;
- Conclusão;
- documento ausente;
- arquivo selecionado;
- upload em andamento;
- documento processando;
- falha;
- divergência de quantidade/peso;
- justificativa;
- atualização de estoque na confirmação.

## 15. Vendas

O fluxo implementado deve suportar:

- Dados;
- validação de saldo;
- saldo insuficiente;
- Comprovação;
- Conferência;
- comparação quantidade/comprador/preço/valor;
- divergência comercial;
- decisão humana;
- justificativa;
- baixa de estoque somente na confirmação;
- Conclusão.

Quantidade maior que saldo disponível bloqueia avanço.

## 16. Estoque

Implementar no mínimo:

- visão geral por material;
- saldo atual;
- entradas/saídas;
- detalhe do material;
- histórico de movimentações;
- abertura da movimentação relacionada.

Não implementar edição direta de saldo na UI M1.

## 17. Pendências

Centralizar somente itens que exigem ação humana.

Ações M1:

- anexar documento;
- tentar novamente;
- resolver divergência;
- justificar;
- conferir quando aplicável.

Processamento assíncrono saudável não é pendência.

## 18. Documentos

A biblioteca mostra arquivos existentes e vinculados a movimentações.

Não implementar upload global órfão de contexto no M1.

Movimentação sem documento aparece em Pendências, não como linha falsa em Documentos.

## 19. Copy e vocabulário

Usar o vocabulário canônico documentado no UI System e Interaction States.

Não introduzir por conta própria:

- auditado;
- certificado;
- conforme;
- recomendado;
- fraude;
- score de risco;
- tolerância automática;
- homologado como status de comprador/fornecedor;
- sincronização em tempo real garantida.

## 20. Responsividade

O escopo homologado neste checkpoint é desktop.

A estrutura deve ser construída de modo a permitir responsividade futura, mas não redesenhar ou inventar a experiência mobile nesta entrega sem um contrato separado.

## 21. Acessibilidade mínima

A implementação deve manter:

- navegação por teclado para controles principais;
- labels reais nos inputs;
- `aria` apropriado para alerts, loading e estados;
- contraste legível;
- não depender apenas de cor para comunicar estado;
- foco visível;
- botões desabilitados semanticamente, não apenas visualmente.

## 22. Testes obrigatórios

Usar Vitest/Testing Library e testes de domínio/serviço existentes.

Cobertura funcional mínima:

- shell reutilizado em todas as páginas;
- item ativo correto da sidebar;
- stepper muda de estado corretamente;
- venda bloqueada quando quantidade > saldo;
- upload selecionado/enviando/falha/processando/processado;
- processamento em segundo plano não inventa dados;
- divergência exige decisão;
- justificativa habilita confirmação apenas quando válida;
- estoque muda apenas na confirmação;
- documento ausente vira pendência;
- documento processando normalmente não vira pendência;
- Documentos lista apenas arquivos reais vinculados.

## 23. Critério visual de aceite

Comparar cada página implementada contra:

- Master V1.1;
- screen map;
- screenshots homologados.

Aceite exige consistência de:

- shell;
- hierarquia;
- componentes;
- spacing;
- estados;
- copy;
- comportamento.

Não aceitar páginas que “parecem parecidas” mas recriam componentes de forma independente.

## 24. Critério de engenharia

Antes de considerar uma tarefa concluída:

- typecheck deve passar;
- testes relevantes devem passar;
- build deve passar;
- nenhuma regra de domínio homologada pode depender de fixture visual;
- nenhuma nova palavra/estado de produto deve surgir sem contrato.

Comandos existentes do app web:

```bash
pnpm --filter @verdis/web typecheck
pnpm --filter @verdis/web test
pnpm --filter @verdis/web build
```

## 25. Regra de mudança

Se o Antigravity identificar uma lacuna real entre domínio, interação e UI:

1. não escolher sozinho;
2. registrar a lacuna;
3. propor a menor decisão necessária;
4. atualizar primeiro o contrato correspondente;
5. só então implementar.

Este contrato protege o produto contra drift visual e funcional durante a implementação.
