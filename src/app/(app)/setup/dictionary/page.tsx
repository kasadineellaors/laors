import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { DictionaryClient } from "@/components/setup/dictionary-client";

export default async function DictionarySetupPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [tasks, movements, adjustments, financial] = await Promise.all([
    getRanchOptions(orgId, "task_categories"),
    getRanchOptions(orgId, "movement_reasons"),
    getRanchOptions(orgId, "adjustment_reasons"),
    getRanchOptions(orgId, "financial_categories"),
  ]);

  const sections = [
    { title: "Task categories", table: "task_categories" as const, items: tasks },
    { title: "Movement reasons", table: "movement_reasons" as const, items: movements },
    { title: "Adjustment reasons", table: "adjustment_reasons" as const, items: adjustments },
    {
      title: "Financial categories",
      table: "financial_categories" as const,
      items: financial,
      categoryType: "expense" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/setup" className="text-sm font-medium text-olive hover:underline">
          ← Ranch Setup
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">Ranch Dictionary</h1>
        <p className="text-charcoal/70">Reasons and categories — rename, add, or archive</p>
      </div>

      <DictionaryClient orgId={orgId} sections={sections} />
    </div>
  );
}
