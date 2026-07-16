-- Phase 30 — Shareable lot closeout links and customer email

CREATE TABLE IF NOT EXISTS public.lot_closeout_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cattle_group_id UUID NOT NULL REFERENCES public.cattle_groups(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_emailed_at TIMESTAMPTZ,
  last_emailed_to TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT lot_closeout_shares_one_per_lot UNIQUE (cattle_group_id)
);

CREATE INDEX IF NOT EXISTS lot_closeout_shares_token_idx
  ON public.lot_closeout_shares(share_token);

ALTER TABLE public.lot_closeout_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read closeout shares" ON public.lot_closeout_shares;
CREATE POLICY "Members read closeout shares"
  ON public.lot_closeout_shares FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Members manage closeout shares" ON public.lot_closeout_shares;
CREATE POLICY "Members manage closeout shares"
  ON public.lot_closeout_shares FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';
