# VERDIS M1 — Mobile & PWA Acceptance Record

Data do checkpoint: **18/09/2026**  
Status: **Experiência Mobile Operacional e PWA homologados e publicados em produção**.

---

## 1. Escopo Homologado

Este checkpoint valida e estende o M1 Cooperative Pilot para operação móvel em campo e capacidades de Progressive Web App (PWA):

- **Menu Lateral Adaptativo (Drawer):** Transição responsiva abaixo de 820px para drawer deslizante com backdrop translúcido e fechamento por toque ou navegação.
- **Top Header Mobile:** Marca editorial simplificada, botão hambúrguer ergonômico, ocultação inteligente de elementos desktop concorrentes.
- **Grade 2x2 de Indicadores:** Reorganização dos cartões de métricas em grade de duas colunas para viewports verticais estreitos (375px a 430px).
- **Ações Rápidas de Bolso:** Botões `+ RECEBER MATERIAL` e `+ REGISTRAR VENDA` em largura total com altura mínima de 44px para operação com uma mão.
- **Formulários e Filtros em Coluna Única:** Adequação de campos, seletores e botões de filtro sem transbordo horizontal (*horizontal scrolling* indesejado).
- **Service Worker & PWA:**
  - `manifest.webmanifest` configurado para execução standalone e cor de tema canônica `#536938`.
  - Ícones em alta resolução 192x192, 512x512 e SVG vetorial.
  - `sw.js` com estratégia de precache do shell e cache dinâmico de assets.
  - Indicador de conectividade em tempo real no cabeçalho (`OPERAÇÃO ATIVA` vs `MODO OFFLINE · CACHE LOCAL`).

---

## 2. Rastreabilidade Git e Produção

- **Branch `main`:** [`44f52b5`](https://github.com/armidiasintegradas/verdisos/commit/44f52b5)
- **Branch `gh-pages`:** [`c6c63e4`](https://github.com/armidiasintegradas/verdisos/commit/c6c63e4)
- **URL de Produção:** [https://armidiasintegradas.github.io/verdisos/](https://armidiasintegradas.github.io/verdisos/)

---

## 3. Critérios de Qualidade Verificados

1. **Vitest:** 38/38 arquivos de teste e 169/169 testes aprovados (100%).
2. **TypeScript:** `tsc --noEmit` aprovado com 0 erros.
3. **Headless Chrome:** Capturas visuais em 390x844 (iPhone 13/14/15/16) validadas em todas as 7 rotas principais.
4. **Domínio e Banco de Dados:** Nenhuma regra de negócio, cálculo de balanço de massa, tabela Supabase ou política RLS alterada.
