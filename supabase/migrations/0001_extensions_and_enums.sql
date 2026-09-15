create type public.tenant_status as enum ('active','suspended','archived');
create type public.membership_status as enum ('active','invited','suspended','ended');
create type public.movement_type as enum ('receipt','inbound','outbound','collection','transfer','sorting','sale','destination','reject','adjustment');
create type public.movement_status as enum ('draft','posted','voided');
create type public.evidence_level as enum ('AUTODECLARED','EVIDENCED','DOCUMENT_VERIFIED','VALIDATED','RECONCILED','TRACEABILITY_PROVEN','AUDITED');
create type public.review_status as enum ('pending','accepted','rejected','needs_review');
