-- Phase 32 — Customer portal (lots, closeouts, invoices)

CREATE TABLE IF NOT EXISTS public.customer_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  portal_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_emailed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT customer_portal_access_one_per_customer UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS customer_portal_access_token_idx
  ON public.customer_portal_access(portal_token);

ALTER TABLE public.customer_portal_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read customer portal access" ON public.customer_portal_access;
CREATE POLICY "Members read customer portal access"
  ON public.customer_portal_access FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Members manage customer portal access" ON public.customer_portal_access;
CREATE POLICY "Members manage customer portal access"
  ON public.customer_portal_access FOR ALL
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
