-- Phase 42 — Pasture rate per head/day on owners (separate from yardage)

ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS pasture_rate_per_head_day NUMERIC(12, 4)
  CHECK (pasture_rate_per_head_day IS NULL OR pasture_rate_per_head_day >= 0);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS pasture_rate_per_head_day NUMERIC(12, 4)
  CHECK (pasture_rate_per_head_day IS NULL OR pasture_rate_per_head_day >= 0);

ALTER TABLE public.invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_category_check;
ALTER TABLE public.invoice_lines
  ADD CONSTRAINT invoice_lines_category_check CHECK (
    category IS NULL OR category IN (
      'yardage', 'pasture', 'treatments', 'feed', 'processing', 'misc', 'dead'
    )
  );
