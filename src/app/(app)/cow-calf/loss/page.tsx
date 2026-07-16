import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCowCalfLosses } from "@/lib/cow-calf/exit-queries";
import { LOSS_CAUSE_LABELS } from "@/lib/cow-calf/constants";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Death & Loss — Cow-Calf — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CowCalfLossPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const losses = await listCowCalfLosses(orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader title="Death & loss" subtitle="Mortality and loss records for the cow-calf herd." />
        {canManage ? (
          <Link href="/cow-calf/loss/new">
            <Button size="lg">+ Record loss</Button>
          </Link>
        ) : null}
      </div>

      {losses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No loss records yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {losses.map((l) => (
            <li key={l.id} className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4">
              <p className="font-semibold text-navy">
                {l.animal_tag ?? "Animal"}
                {l.animal_name ? ` · ${l.animal_name}` : ""}
              </p>
              <p className="text-sm text-text-secondary">
                {formatDate(l.loss_date)} · {LOSS_CAUSE_LABELS[l.cause]}
                {l.herd_name ? ` · ${l.herd_name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
