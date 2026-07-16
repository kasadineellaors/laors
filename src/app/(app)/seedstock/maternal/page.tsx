import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canExportReports } from "@/lib/auth/roles";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { getMaternalDashboard } from "@/lib/seedstock/maternal";
import { MaternalDashboardView } from "@/components/seedstock/maternal-dashboard";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Maternal Intelligence — LAORS",
};

export default async function MaternalIntelligencePage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  let dashboard;
  try {
    dashboard = await getMaternalDashboard(orgId);
  } catch {
    return (
      <div className="space-y-4">
        <Link href="/seedstock" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Seedstock
        </Link>
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Maternal intelligence</h1>
        <p className="rounded-xl border border-status-critical/30 bg-status-critical/5 px-4 py-3 text-sm text-text-primary">
          Run <code className="text-xs">supabase/RUN_PHASE16.sql</code> in Supabase, then refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seedstock" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
          ← Seedstock
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Maternal intelligence</h1>
        <p className="text-text-secondary">
          Fertility scores, calving distribution, family performance, and lifetime value
        </p>
      </div>
      <MaternalDashboardView
        orgId={orgId}
        dashboard={dashboard}
        canExport={canExportReports(session.membership?.system_role)}
      />
    </div>
  );
}
