import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { listFeedItemOptions, listRationIngredients } from "@/lib/feed/inventory-queries";
import { RationForm } from "@/components/feed/ration-form";

export const metadata: Metadata = {
  title: "New Feed Ration — LAORS",
};

export default async function NewRationPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) redirect("/feed/rations");

  const orgId = session.organization!.id;
  const feedItems = await listFeedItemOptions(orgId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/feed/rations" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Rations
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">New ration</h1>
      </div>
      <RationForm orgId={orgId} feedItems={feedItems} />
    </div>
  );
}
