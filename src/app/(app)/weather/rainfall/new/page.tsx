import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { RainfallForm } from "@/components/weather/rainfall-form";

export const metadata: Metadata = {
  title: "Log Rainfall — LAORS",
};

export default async function NewRainfallPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const locations = await getTreePickerOptions(orgId).then((nodes) =>
    nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/weather/rainfall" className="text-sm font-medium text-olive hover:underline">
          ← Rainfall
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Log rainfall</h1>
      </div>
      <RainfallForm orgId={orgId} locationOptions={locations} />
    </div>
  );
}
