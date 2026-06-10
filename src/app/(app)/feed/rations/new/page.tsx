import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { RationForm } from "@/components/feed/ration-form";

export const metadata: Metadata = {
  title: "New Feed Ration — LAORS",
};

export default async function NewRationPage() {
  const session = await requireOnboardedUser();
  if (!canManageTeam(session.membership?.system_role)) redirect("/feed/rations");

  const orgId = session.organization!.id;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/feed/rations" className="text-sm font-medium text-olive hover:underline">
          ← Rations
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">New ration</h1>
      </div>
      <RationForm orgId={orgId} />
    </div>
  );
}
