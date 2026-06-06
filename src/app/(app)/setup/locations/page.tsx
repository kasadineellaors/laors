import { requireOnboardedUser } from "@/lib/auth/session";
import { getLocationTreeWithRollups, getRanchTotalHeadCount } from "@/lib/locations/rollups";
import { getRanchOptions } from "@/lib/locations/options";
import { createClient } from "@/lib/supabase/server";
import { getBreadcrumb } from "@/lib/locations/tree";
import type { LocationRow } from "@/lib/locations/types";
import { LocationsSetupClient } from "@/components/locations/locations-setup-client";

export default async function LocationsSetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const supabase = await createClient();

  const [tree, totalHead, locationTypes, { data: rawLocations }] = await Promise.all([
    getLocationTreeWithRollups(orgId),
    getRanchTotalHeadCount(orgId),
    getRanchOptions(orgId, "location_types"),
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .lt("depth", 2)
      .order("depth")
      .order("name"),
  ]);

  const allLocations = (rawLocations ?? []) as LocationRow[];

  const parentOptions = allLocations.map((loc) => ({
    value: loc.id,
    label: getBreadcrumb(loc.id, allLocations)
      .map((l) => l.name)
      .join(" › "),
  }));

  const locationTypeOptions = locationTypes.filter(
    (t) => t.meta?.tier === "location",
  );

  return (
    <LocationsSetupClient
      tree={tree}
      totalHead={totalHead}
      orgId={orgId}
      parentOptions={parentOptions}
      locationTypeOptions={locationTypeOptions}
    />
  );
}
