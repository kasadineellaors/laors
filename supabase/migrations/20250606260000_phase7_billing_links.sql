-- Phase 7: link cattle groups and sales to customers for billing

ALTER TABLE public.cattle_groups
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cattle_groups_customer_idx ON public.cattle_groups(customer_id);

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_records_customer_idx ON public.sales_records(customer_id);
