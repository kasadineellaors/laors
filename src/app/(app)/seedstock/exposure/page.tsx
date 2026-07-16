import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canWriteInventory } from "@/lib/auth/roles";
import { hasSeedstockMode } from "@/lib/seedstock/constants";
import { listExposureRecords } from "@/lib/seedstock/exposure-queries";
import { Button } from "@/components/ui/button";
import type { OperationMode } from "@/types/auth";

export const metadata: Metadata = {
  title: "Exposure Records — LAORS",
};

export default async function SeedstockExposurePage() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];
  if (!hasSeedstockMode(modes)) redirect("/cattle");

  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);
  let records: Awaited<ReturnType<typeof listExposureRecords>> = [];
  try {
    records = await listExposureRecords(orgId);
  } catch {
    records = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/seedstock" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
            ← Seedstock
          </Link>
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Exposure records</h1>
          <p className="text-text-secondary">Natural service breeding windows by dam and bull</p>
        </div>
        {canManage ? (
          <Link href="/seedstock/exposure/new">
            <Button size="lg">+ Exposure</Button>
          </Link>
        ) : null}
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No exposure records yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4"
            >
              <p className="font-semibold text-navy">
                {r.dam_tag ?? "Dam"} × {r.bull_tag ?? r.sire_tag ?? "Bull"}
              </p>
              <p className="text-sm text-text-secondary">
                {r.exposure_start}
                {r.exposure_end ? ` – ${r.exposure_end}` : " – ongoing"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
