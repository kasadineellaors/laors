import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { LocationTypesList } from "@/components/setup/location-types-list";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Location Types — LAORS",
};

export default async function LocationTypesSetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const types = await getRanchOptions(orgId, "location_types");

  return (
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Location Types"
        subtitle="Customize names such as pasture, pen, trap, section, and feedyard."
      />
      <LocationTypesList orgId={orgId} types={types} />
    </ManageSubpageShell>
  );
}
