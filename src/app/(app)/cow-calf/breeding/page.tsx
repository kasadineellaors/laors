import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import { getBreedingSummary, listBreedingRecords } from "@/lib/cow-calf/breeding-queries";
import { BreedingList } from "@/components/cow-calf/breeding-list";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Breeding — LAORS",
};

export default async function BreedingPage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasCowCalfMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const [records, summary] = await Promise.all([
    listBreedingRecords(orgId),
    getBreedingSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/cow-calf" className="text-sm font-medium text-olive hover:underline">
            ← Cow-Calf
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-charcoal">Breeding</h1>
          <p className="text-charcoal/70">
            {summary.confirmed} confirmed · {summary.dueNext30Days} due in 30 days
          </p>
        </div>
        <Link href="/cow-calf/breeding/new">
          <Button size="lg">+ Record</Button>
        </Link>
      </div>
      <BreedingList records={records} />
    </div>
  );
}
