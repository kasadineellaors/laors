-- Phase 47 — Invoices bill to owners (not legacy customers FK)
-- Run after RUN_PHASE33.sql

-- Drop FK that requires customer_id to exist in customers when we use owners
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;

-- Backfill owner_id from legacy customer_id
UPDATE public.invoices i
SET owner_id = i.customer_id
WHERE i.owner_id IS NULL
  AND i.customer_id IS NOT NULL;

-- Clear customer_id when it does not match a legacy customers row
UPDATE public.invoices i
SET customer_id = NULL
WHERE i.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = i.customer_id
      AND c.organization_id = i.organization_id
  );

CREATE INDEX IF NOT EXISTS invoices_owner_idx ON public.invoices(owner_id);
