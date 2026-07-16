import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCowCalfWeaningRecords, getWeaningSummary } from "@/lib/cow-calf/exit-queries";
import { WEANING_METHOD_LABELS } from "@/lib/cow-calf/constants";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Weaning — Cow-Calf — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CowCalfWeaningPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const [records, summary] = await Promise.all([
    listCowCalfWeaningRecords(orgId),
    getWeaningSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader
          title="Weaning"
          subtitle={`${summary.calvesReadyToWean} calves at side · ${summary.thisMonth} weaned this month`}
        />
        {canManage ? (
          <Link href="/cow-calf/weaning/new">
            <Button size="lg">+ Wean calves</Button>
          </Link>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No weaning records yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
              <p className="font-semibold text-navy">
                {r.calf_tag ?? "Calf"}
                {r.dam_tag ? ` · Dam ${r.dam_tag}` : ""}
              </p>
              <p className="text-sm text-text-secondary">
                {formatDate(r.weaned_at)}
                {r.weaning_weight_lbs != null ? ` · ${r.weaning_weight_lbs} lb` : ""}
                {r.weaning_method ? ` · ${WEANING_METHOD_LABELS[r.weaning_method]}` : ""}
                {r.destination_herd_name ? ` → ${r.destination_herd_name}` : ""}
              </p>
              {r.retained_as_heifer ? (
                <p className="mt-1 text-xs font-medium text-brown">Retained as replacement</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
