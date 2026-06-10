-- LAORS Phase 16: Maternal & reproductive intelligence

ALTER TABLE public.calving_records
  ADD COLUMN IF NOT EXISTS calving_context TEXT NOT NULL DEFAULT 'cow_calf'
    CHECK (calving_context IN ('cow_calf', 'seedstock'));

ALTER TABLE public.calving_records
  ADD COLUMN IF NOT EXISTS dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bull_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calf_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS breeding_record_id UUID REFERENCES public.breeding_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calving_ease_score INTEGER
    CHECK (calving_ease_score IS NULL OR (calving_ease_score >= 1 AND calving_ease_score <= 5)),
  ADD COLUMN IF NOT EXISTS assistance_type TEXT
    CHECK (
      assistance_type IS NULL OR assistance_type IN (
        'unassisted', 'easy_pull', 'hard_pull', 'c_section', 'unknown'
      )
    ),
  ADD COLUMN IF NOT EXISTS loss_cause TEXT
    CHECK (
      loss_cause IS NULL OR loss_cause IN (
        'calving_difficulty', 'disease', 'environmental', 'unknown'
      )
    );

CREATE INDEX IF NOT EXISTS calving_records_dam_idx
  ON public.calving_records(organization_id, dam_id)
  WHERE dam_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calving_records_context_idx
  ON public.calving_records(organization_id, calving_context);

ALTER TABLE public.individual_animals
  ADD COLUMN IF NOT EXISTS dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sire_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS epd_calving_ease NUMERIC(6, 2);

CREATE INDEX IF NOT EXISTS individual_animals_dam_idx
  ON public.individual_animals(organization_id, dam_id)
  WHERE dam_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.exposure_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  breeding_context TEXT NOT NULL DEFAULT 'seedstock'
    CHECK (breeding_context IN ('cow_calf', 'seedstock')),
  dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  dam_tag TEXT,
  bull_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  sire_tag TEXT,
  exposure_start DATE NOT NULL,
  exposure_end DATE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exposure_records_org_idx
  ON public.exposure_records(organization_id, exposure_start DESC);

DROP TRIGGER IF EXISTS exposure_records_updated_at ON public.exposure_records;
CREATE TRIGGER exposure_records_updated_at
  BEFORE UPDATE ON public.exposure_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.exposure_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exposure_records_org ON public.exposure_records;
CREATE POLICY exposure_records_org ON public.exposure_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE TABLE IF NOT EXISTS public.weaning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calving_record_id UUID REFERENCES public.calving_records(id) ON DELETE SET NULL,
  dam_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  calf_id UUID REFERENCES public.individual_animals(id) ON DELETE SET NULL,
  calf_tag TEXT,
  weaned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weaning_weight_lbs NUMERIC(8, 2)
    CHECK (weaning_weight_lbs IS NULL OR weaning_weight_lbs >= 0),
  retained_as_heifer BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weaning_records_org_idx
  ON public.weaning_records(organization_id, weaned_at DESC);

CREATE INDEX IF NOT EXISTS weaning_records_dam_idx
  ON public.weaning_records(organization_id, dam_id)
  WHERE dam_id IS NOT NULL;

DROP TRIGGER IF EXISTS weaning_records_updated_at ON public.weaning_records;
CREATE TRIGGER weaning_records_updated_at
  BEFORE UPDATE ON public.weaning_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.weaning_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weaning_records_org ON public.weaning_records;
CREATE POLICY weaning_records_org ON public.weaning_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

NOTIFY pgrst, 'reload schema';
