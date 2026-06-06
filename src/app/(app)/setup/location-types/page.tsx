import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { LocationTypesList } from "@/components/setup/location-types-list";

export default async function LocationTypesSetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const types = await getRanchOptions(orgId, "location_types");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Location Types</h1>
        <p className="text-charcoal/70">Labels for your ranch map tiers — edit anytime</p>
      </div>

      <LocationTypesList orgId={orgId} types={types} />
    </div>
  );
}
