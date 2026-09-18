# Verdis

Plataforma integrada de gestão da circularidade e impacto socioambiental.

## 🚀 Demonstração Online (M1 Cooperative Pilot)

A interface operacional do **M1 Cooperative Pilot** está homologada e publicada em produção:
👉 **[https://armidiasintegradas.github.io/verdisos/](https://armidiasintegradas.github.io/verdisos/)**

Ambiente padrão: **Cooperativa Demo · M1 Pilot (Galpão 01)**.

## 🛠️ Como Executar Localmente

### Pré-requisitos
- Node.js 22+
- pnpm 10+

### Instalação e Execução
```bash
# Instalar dependências
pnpm install

# Iniciar ambiente de desenvolvimento
pnpm dev

# Executar testes unitários (Vitest)
pnpm test

# Checagem de tipos (TypeScript)
pnpm typecheck

# Build de produção
pnpm build
```


## Propósito

A Verdis transforma operação ambiental em informação confiável, rastreável e útil para diferentes públicos. O produto nasce com foco em resíduos, circularidade e evidências, evoluindo depois para compliance, indicadores ambientais, ESG e inteligência.

Princípio central:

> Um registro operacional deve gerar múltiplos resultados, sem exigir que o mesmo dado seja informado várias vezes.

## Ambientes do produto

- **Cooperativas** — autogestão operacional, materiais, estoque, vendas, documentos e evidências.
- **Empresas** — geração, coleta, destinação, rastreabilidade, conformidade e indicadores.
- **Eventos** — operação ambiental em campo, pesagens, equipes, ocorrências e relatório final.
- **Gestão Pública** — visão territorial, acompanhamento das organizações, contratos, regularidade e indicadores.
- **Central Verdis** — administração, auditoria, inteligência, metodologias, permissões e visão consolidada.

## Escopo do MVP

O MVP v1 deve provar três capacidades:

1. capturar o dado operacional;
2. comprovar esse dado com evidências;
3. transformar o mesmo dado em valor para públicos diferentes.

Portanto, o primeiro produto é:

**Resíduos + Circularidade + Evidências.**

Água, energia, carbono ampliado, Social, Governança, benchmarking e IA preditiva ficam para fases posteriores.

## Princípios de arquitetura

- núcleo de dados único;
- multi-tenant;
- segregação de acesso por organização, unidade, papel e finalidade;
- movimentações ambientais como objeto central;
- relatórios como consequência das movimentações;
- evidências preservadas em sua forma original;
- IA interpreta e compara, mas não substitui documento nem auditoria humana;
- trilha de auditoria desde a fundação;
- banco relacional como fonte de verdade operacional;
- GitHub como fonte de verdade do produto e do código.

## Fluxo de desenvolvimento

`Produto/PRD → domínio → dados → UX no Stitch → issue/branch no GitHub → implementação no Antigravity → testes → pull request → homologação`

## Documentação

- `docs/product/PRD.md` — requisitos do produto e escopo do MVP.
- `docs/architecture/domain-model.md` — entidades, responsabilidades e relacionamentos do núcleo.
- `docs/ux/verdis-ui-system-v1.1.md` — especificação do Design System e Master Reference.
- `docs/verification/m1-stitch-acceptance.md` — registro de homologação desktop do M1 Cooperative Pilot.
- `docs/verification/m1-mobile-acceptance.md` — registro de homologação mobile e PWA do M1 Cooperative Pilot.

## Milestones planejadas

- **M0 — Verdis Core Foundation**
- **M1 — Circularity Engine**
- **M2 — Cooperative Pilot**
- **M3 — Company Pilot**
- **M4 — Event Pilot**
- **M5 — Public Management View**

## Regra de UX

> O usuário não deve trabalhar para alimentar a plataforma. A plataforma deve transformar o trabalho que ele já realiza em informação confiável.
