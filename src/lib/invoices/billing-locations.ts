import { createClient } from "@/lib/supabase/server";
import {
  resolveBillingRateMode,
  type BillingModeLocationRow,
  type BillingModeTypeRow,
  type BillingRateMode,
} from "@/lib/locations/billing-mode";

export interface ResolvedLocationBilling {
  mode: BillingRateMode;
  locationId: string | null;
  locationName: string | null;
}

export interface OrgBillingModeContext {
  resolveForLocationId: (locationId: string | null) => ResolvedLocationBilling;
}

export async function loadOrgBillingModes(orgId: string): Promise<OrgBillingModeContext> {
  const supabase = await createClient();

  const [{ data: types }, { data: locations }] = await Promise.all([
    supabase
      .from("location_types")
      .select("id, tier, billing_rate_mode")
      .eq("organization_id", orgId)
      .eq("is_active", true),
    supabase
      .from("locations")
      .select("id, name, location_type_id, billing_rate_mode")
      .eq("organization_id", orgId)
      .eq("is_active", true),
  ]);

  const typeById = new Map<string, BillingModeTypeRow>(
    (types ?? []).map((t) => [
      t.id,
      {
        id: t.id,
        tier: t.tier,
        billing_rate_mode: (t as { billing_rate_mode?: BillingRateMode | null })
          .billing_rate_mode ?? null,
      },
    ]),
  );

  const locationById = new Map<string, BillingModeLocationRow>(
    (locations ?? []).map((l) => [
      l.id,
      {
        id: l.id,
        name: l.name,
        location_type_id: l.location_type_id,
        billing_rate_mode:
          (l as { billing_rate_mode?: BillingModeLocationRow["billing_rate_mode"] })
            .billing_rate_mode ?? "inherit",
      },
    ]),
  );

  return {
    resolveForLocationId(locationId: string | null): ResolvedLocationBilling {
      if (!locationId) {
        return { mode: "yardage", locationId: null, locationName: null };
      }
      const loc = locationById.get(locationId);
      if (!loc) {
        return { mode: "yardage", locationId, locationName: null };
      }
      const type = typeById.get(loc.location_type_id);
      return {
        mode: resolveBillingRateMode(loc, type),
        locationId,
        locationName: loc.name,
      };
    },
  };
}
