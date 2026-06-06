-- Phase ship polish: treatment invoicing flags

ALTER TABLE public.treatment_records
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS treatment_records_invoice_idx
  ON public.treatment_records(invoice_id)
  WHERE invoice_id IS NOT NULL;
