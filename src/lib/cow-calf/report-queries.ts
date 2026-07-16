import { createClient } from "@/lib/supabase/server";
import { getCalvingAlertInput } from "./calving-alert-queries";
import { getBreedingSummary } from "./breeding-queries";
import { buildForemanSummary } from "./foreman-summary";
import { getEnterpriseInventorySummary, listCowCalfHerds } from "./herd-queries";
import { getProcessingSummary } from "./processing-queries";
import { getWeaningSummary, getCowCalfSalesSummary } from "./exit-queries";
import { pregnancyRateFromResults } from "./reproduction-helpers";
import { averageWeight, calvingLiveRatePct } from "./report-metrics";
import type { CowCalfReportSnapshot } from "./report-types";

export async function getCowCalfReportSnapshot(orgId: string): Promise<CowCalfReportSnapshot> {
  const supabase = await createClient();
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Str = since30.toISOString().slice(0, 10);

  const [
    inventory,
    herds,
    breedingSummary,
    weaningSummary,
    processingSummary,
    salesSummary,
    calvingAlerts,
    unassignedResult,
    openResult,
    breedingStatusRows,
    calvingYtdRows,
    calvingMonthRows,
    calvingAllRows,
    weaningYtdRows,
    lossCountResult,
  ] = await Promise.all([
    getEnterpriseInventorySummary(orgId),
    listCowCalfHerds(orgId),
    getBreedingSummary(orgId, "cow_calf"),
    getWeaningSummary(orgId),
    getProcessingSummary(orgId),
    getCowCalfSalesSummary(orgId),
    getCalvingAlertInput(orgId),
    supabase
      .from("individual_animals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("registry_context", "cow_calf")
      .eq("is_active", true)
      .is("cow_calf_herd_id", null)
      .in("animal_type", ["cow", "heifer"]),
    supabase
      .from("individual_animals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("registry_context", "cow_calf")
      .eq("is_active", true)
      .eq("reproductive_status", "open"),
    supabase
      .from("breeding_records")
      .select("pregnancy_status")
      .eq("organization_id", orgId)
      .eq("breeding_context", "cow_calf")
      .eq("is_active", true),
    supabase
      .from("calving_records")
      .select("outcome")
      .eq("organization_id", orgId)
      .eq("calving_context", "cow_calf")
      .eq("is_active", true)
      .gte("calved_at", yearStart),
    supabase
      .from("calving_records")
      .select("id")
      .eq("organization_id", orgId)
      .eq("calving_context", "cow_calf")
      .eq("is_active", true)
      .gte("calved_at", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`),
    supabase
      .from("calving_records")
      .select("outcome")
      .eq("organization_id", orgId)
      .eq("calving_context", "cow_calf")
      .eq("is_active", true),
    supabase
      .from("weaning_records")
      .select("weaning_weight_lbs, weaned_at")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("weaned_at", yearStart),
    supabase
      .from("cow_calf_loss_records")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .gte("loss_date", since30Str),
  ]);

  const statusRows = breedingStatusRows.data ?? [];
  const pregnancy = pregnancyRateFromResults({
    bred: statusRows.filter((r) => r.pregnancy_status === "bred" || r.pregnancy_status === "confirmed")
      .length,
    open: statusRows.filter((r) => r.pregnancy_status === "open").length,
    recheck: statusRows.filter((r) => r.pregnancy_status === "recheck").length,
    unknown: statusRows.filter((r) => r.pregnancy_status === "unknown").length,
  });

  const ytdCalving = calvingYtdRows.data ?? [];
  const ytdLive = ytdCalving.filter((r) => r.outcome === "live").length;
  const allCalving = calvingAllRows.data ?? [];
  const allLive = allCalving.filter((r) => r.outcome === "live").length;

  const ytdWeaning = weaningYtdRows.data ?? [];
  const weights = ytdWeaning
    .map((r) => (r.weaning_weight_lbs != null ? Number(r.weaning_weight_lbs) : null))
    .filter((w): w is number => w != null && !Number.isNaN(w));

  const dataQuality = buildForemanSummary({
    inventory: { ...inventory, herdCount: herds.length },
    breeding: breedingSummary,
    calving: {
      total: allCalving.length,
      live: allLive,
      thisMonth: (calvingMonthRows.data ?? []).length,
    },
    calvingAlerts,
    calvesReadyToWean: weaningSummary.calvesReadyToWean,
    herds,
    unassignedCowCount: unassignedResult.count ?? 0,
    openCowCount: openResult.count ?? 0,
  });

  return {
    inventory: { ...inventory, herdCount: herds.length },
    reproduction: {
      summary: breedingSummary,
      pregnancyRatePct: pregnancy.rate,
      pregnancyRateLabel: pregnancy.label,
      checkedFemales: pregnancy.denominator,
    },
    calving: {
      yearToDate: ytdCalving.length,
      yearToDateLive: ytdLive,
      yearToDateLiveRatePct: calvingLiveRatePct(ytdLive, ytdCalving.length),
      thisMonth: (calvingMonthRows.data ?? []).length,
      allTimeLive: allLive,
      allTimeTotal: allCalving.length,
    },
    weaning: {
      yearToDate: ytdWeaning.length,
      thisMonth: weaningSummary.thisMonth,
      calvesReadyToWean: weaningSummary.calvesReadyToWean,
      avgWeaningWeightLbs: averageWeight(weights),
    },
    exits: {
      salesLast30Days: salesSummary.headSoldLast30Days,
      headSoldLast30Days: salesSummary.headSoldLast30Days,
      lossesLast30Days: lossCountResult.count ?? 0,
    },
    unprocessedCalves: processingSummary.unprocessedCalves,
    dataQuality,
  };
}
