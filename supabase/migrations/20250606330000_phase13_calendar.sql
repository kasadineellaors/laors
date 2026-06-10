-- LAORS Phase 13: Shared ranch calendar events

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT NOT NULL DEFAULT 'general'
    CHECK (event_type IN ('general', 'feeding', 'health', 'breeding', 'calving', 'move', 'sale', 'other')),
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  cattle_group_id UUID REFERENCES public.cattle_groups(id) ON DELETE SET NULL,
  color TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_events_org_idx
  ON public.calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS calendar_events_starts_idx
  ON public.calendar_events(organization_id, starts_at);

DROP TRIGGER IF EXISTS calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read calendar_events" ON public.calendar_events;
CREATE POLICY "Members read calendar_events"
  ON public.calendar_events FOR SELECT
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Members create calendar_events" ON public.calendar_events;
CREATE POLICY "Members create calendar_events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members update calendar or managers update" ON public.calendar_events;
CREATE POLICY "Members update calendar or managers update"
  ON public.calendar_events FOR UPDATE
  USING (
    public.is_org_member(organization_id)
    AND (
      public.has_org_role(organization_id, ARRAY['owner', 'manager'])
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers delete calendar_events" ON public.calendar_events;
CREATE POLICY "Managers delete calendar_events"
  ON public.calendar_events FOR DELETE
  USING (public.has_org_role(organization_id, ARRAY['owner', 'manager']));

NOTIFY pgrst, 'reload schema';
