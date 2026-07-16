import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import {
  listActiveBullOptions,
  listCowCalfDamOptions,
  listCowCalfHerdOptions,
} from "@/lib/cow-calf/breeding-queries";
import { getTreePickerOptions } from "@/lib/locations/options";
import { EnterpriseCalvingForm } from "@/components/cow-calf/enterprise-calving-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Log Calving — LAORS",
};

export default async function NewCalvingPage({
  searchParams,
}: {
  searchParams: Promise<{ herd?: string }>;
}) {
  const { herd } = await searchParams;
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;

  const [locations, herds, dams, bulls] = await Promise.all([
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCowCalfHerdOptions(orgId),
    listCowCalfDamOptions(orgId, herd),
    listActiveBullOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/cow-calf/calving"
          className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        >
          ← Calving
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          Record calving
        </h1>
      </div>
      <EnterpriseCalvingForm
        orgId={orgId}
        locationOptions={locations}
        herdOptions={herds}
        damOptions={dams}
        bullOptions={bulls}
        defaultHerdId={herd}
      />
    </div>
  );
}
