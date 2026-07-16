import type { Metadata } from "next";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { getCowCalfReportSnapshot } from "@/lib/cow-calf/report-queries";
import { CowCalfReportsView } from "@/components/cow-calf/cow-calf-reports-view";
import { AppPageHeader } from "@/components/layout/app-page-header";

export const metadata: Metadata = {
  title: "Reports — Cow-Calf — LAORS",
};

export default async function CowCalfReportsPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const report = await getCowCalfReportSnapshot(orgId);

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Cow-Calf reports"
        subtitle="Inventory, reproduction, calving, weaning, and data-quality checks — separate from stocker P&L."
      />
      <CowCalfReportsView report={report} />
    </div>
  );
}
