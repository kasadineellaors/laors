import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { ClassificationsList } from "@/components/setup/classifications-list";

export default async function ClassificationsSetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const classifications = await getRanchOptions(orgId, "classifications");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Cattle Classifications</h1>
        <p className="text-charcoal/70">How you group and count cattle — edit anytime</p>
      </div>

      <ClassificationsList orgId={orgId} classifications={classifications} />
    </div>
  );
}
