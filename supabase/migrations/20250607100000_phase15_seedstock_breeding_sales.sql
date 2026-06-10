-- LAORS Phase 15: Seedstock breeding, extended EPDs, sales links

ALTER TABLE public.breeding_records
  ADD COLUMN IF NOT EXISTS breeding_context TEXT NOT NULL DEFAULT 'cow_calf'
    CHECK (breeding_context IN ('cow_calf', 'seedstock'));

ALTER TABLE public.breeding_records
  ADD COLUMN IF NOT EXISTS dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS embryo_donor_tag TEXT,
  ADD COLUMN IF NOT EXISTS embryo_recipient_tag TEXT;

CREATE INDEX IF NOT EXISTS breeding_records_context_idx
  ON public.breeding_records(organization_id, breeding_context);

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS epd_cea NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_doc NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_scrotal NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS epd_marbling NUMERIC(6, 2);

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS individual_animal_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seedstock_sale_type TEXT
    CHECK (seedstock_sale_type IS NULL OR seedstock_sale_type IN ('live_animal', 'semen', 'embryo', 'other'));

CREATE INDEX IF NOT EXISTS sales_records_animal_idx
  ON public.sales_records(individual_animal_id)
  WHERE individual_animal_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
