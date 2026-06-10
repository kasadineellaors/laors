import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listOpenCalvingsForWeaning } from "@/lib/seedstock/weaning-queries";
import { WeaningForm } from "@/components/seedstock/weaning-form";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Record Weaning — LAORS",
};

export default async function NewWeaningPage({
  searchParams,
}: {
  searchParams: Promise<{ calvingId?: string }>;
}) {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");
  if (!canWriteInventory(session.membership?.system_role)) redirect("/seedstock/weaning");

  const { calvingId } = await searchParams;
  const orgId = session.organization!.id;
  const calvingOptions = await listOpenCalvingsForWeaning(orgId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seedstock/weaning" className="text-sm font-medium text-olive hover:underline">
          ← Weaning
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Record weaning</h1>
        <p className="text-sm text-charcoal/60">
          Link to a calving record. Check &quot;Retain as heifer&quot; to auto-register in seedstock.
        </p>
      </div>
      <WeaningForm orgId={orgId} calvingOptions={calvingOptions} defaultCalvingId={calvingId} />
    </div>
  );
}
