-- LAORS ship polish: prevent double-billing treatments on generated invoices
-- Run after RUN_PHASE7.sql (or included in RUN_ALL_PHASES.sql)

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS treatment_records_invoice_idx
  ON public.treatment_records(invoice_id)
  WHERE invoice_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
