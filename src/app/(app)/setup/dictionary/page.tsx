import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions } from "@/lib/locations/options";
import { DictionaryClient } from "@/components/setup/dictionary-client";
import { ManageSubpageHeader } from "@/components/setup/manage-subpage-header";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Categories & Labels — LAORS",
};

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
    <ManageSubpageShell>
      <ManageSubpageHeader
        title="Categories & Labels"
        subtitle="Manage task categories, treatment reasons, and financial labels."
      />
      <DictionaryClient orgId={orgId} sections={sections} />
    </ManageSubpageShell>
  );
}
