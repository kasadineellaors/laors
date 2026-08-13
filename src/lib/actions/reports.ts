"use server";

import { buildHeadDaysReport } from "@/lib/reports/head-days";
import { buildOwnerTotalsReport } from "@/lib/reports/owner-totals";

export async function fetchHeadDaysReport(
  orgId: string,
  input: {
    periodStart: string;
    periodEnd: string;
    ownerId?: string;
  },
) {
  const result = await buildHeadDaysReport(
    orgId,
    input.periodStart,
    input.periodEnd,
    { ownerId: input.ownerId || undefined },
  );
  if ("error" in result) return { error: result.error };
  return { report: result };
}

export async function fetchOwnerTotalsReport(
  orgId: string,
  input: {
    periodStart: string;
    periodEnd: string;
    ownerId?: string;
    lotId?: string;
    locationId?: string;
    lotStatus?: "active" | "closed" | "all";
    search?: string;
  },
) {
  const result = await buildOwnerTotalsReport(orgId, input.periodStart, input.periodEnd, {
    ownerId: input.ownerId || undefined,
    lotId: input.lotId || undefined,
    locationId: input.locationId || undefined,
    lotStatus: input.lotStatus ?? "all",
    search: input.search || undefined,
  });
  if ("error" in result) return { error: result.error };
  return { report: result };
}
