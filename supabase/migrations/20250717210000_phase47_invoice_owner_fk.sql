-- Phase 47 — Invoices bill to owners (not legacy customers FK)

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;

UPDATE public.invoices i
SET owner_id = i.customer_id
WHERE i.owner_id IS NULL
  AND i.customer_id IS NOT NULL;

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
