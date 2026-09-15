# Verdis M0 — Sales Addendum

> **For agentic workers:** This addendum amends `docs/superpowers/plans/2026-09-15-verdis-m0-core-foundation.md` before M0 is merged.

**Reason:** The approved PRD includes material sales as P0, and the Domain Model defines `Sale`, but the original implementation plan modeled only `movement_type='sale'` and omitted the commercial projection table.

**Decision:** Add `public.sales` as a 1:1 commercial projection of a sale movement. `Movement` remains the operational source of mass truth; `Sale` stores commercial attributes and cannot disagree with the linked movement.

## Files

- Create: `supabase/migrations/0009_sales.sql`
- Test: `supabase/tests/database/0009_sales.test.sql`

## Invariants

- `movement_id` is unique in `sales`.
- The linked movement must have `movement_type='sale'`.
- Tenant, seller organization, unit, material and quantity must match the linked movement.
- Buyer is represented through `counterparties` so it may be either a Verdis participant or an external entity.
- `total_amount` is derived from `quantity_kg * unit_price`.
- A fiscal document may be linked without replacing the original document.
- Sales do not create an independent stock effect; the linked posted movement creates the ledger effect.
- RLS uses `movement.read` for reading and `sale.create` for creation in the seller scope.
