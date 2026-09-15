# M0 — CI Verification Gate

A branch `feature/m0-core-foundation` só pode sair de draft quando, no mesmo commit:

- unit tests do web app passam;
- typecheck TypeScript passa;
- build Vite passa;
- `supabase start` aplica todas as migrations sem erro;
- todos os testes pgTAP passam;
- o PR permanece sem segredos e sem dependência de permissões apenas no frontend.

O CI é evidência de integração; a homologação funcional da M0 ainda exige seed determinístico e o fluxo ponta a ponta definido no plano de implementação.
