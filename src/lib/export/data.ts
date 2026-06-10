import { createClient } from "@/lib/supabase/server";
import { listBreedingRecords } from "@/lib/cow-calf/breeding-queries";
import { listCalvingRecords } from "@/lib/cow-calf/queries";
import { listFeedingRecords } from "@/lib/feed/queries";
import { treatmentTypeLabel } from "@/lib/health/constants";
import { listTreatments } from "@/lib/health/queries";
import { listInvoices } from "@/lib/invoices/queries";
import { listSales } from "@/lib/sales/queries";
import { listTasks } from "@/lib/tasks/queries";
import { getMaternalDashboard } from "@/lib/seedstock/maternal";
import { listWeaningRecords } from "@/lib/seedstock/weaning-queries";
import { RETENTION_RECOMMENDATION_LABELS } from "@/lib/seedstock/maternal/constants";
import type { ExportDataset, ExportRecordType } from "./types";
import { EXPORT_TYPE_LABELS } from "./types";

function inDateRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function buildExportDataset(
  orgId: string,
  type: ExportRecordType,
  from?: string,
  to?: string,
): Promise<ExportDataset> {
  const title = EXPORT_TYPE_LABELS[type];
  const filename = `laors-${type}-${stamp()}`;

  switch (type) {
    case "treatments": {
      const rows = await listTreatments(orgId, 2000);
      const filtered = rows.filter((r) => inDateRange(r.treatment_date, from, to));
      return {
        title,
        filename,
        columns: [
          { key: "date", label: "Date" },
          { key: "product", label: "Product" },
          { key: "type", label: "Type" },
          { key: "reason", label: "Reason" },
          { key: "head", label: "Head" },
          { key: "group", label: "Group" },
          { key: "location", label: "Location" },
          { key: "notes", label: "Notes" },
        ],
        rows: filtered.map((r) => ({
          date: r.treatment_date,
          product: r.product_name,
          type: treatmentTypeLabel(r.treatment_type) ?? "",
          reason: r.reason ?? "",
          head: r.head_count,
          group: r.cattle_group_name ?? "",
          location: r.location_label ?? "",
          notes: r.notes ?? "",
        })),
      };
    }
    case "feedings": {
      const rows = await listFeedingRecords(orgId, { limit: 2000, context: "general" });
      const filtered = rows.filter((r) => inDateRange(r.fed_at, from, to));
      return {
        title,
        filename,
        columns: [
          { key: "date", label: "Date" },
          { key: "ration", label: "Ration" },
          { key: "qty", label: "Quantity" },
          { key: "location", label: "Location" },
          { key: "group", label: "Group" },
          { key: "owner", label: "Owner" },
          { key: "head", label: "Head fed" },
          { key: "fed_by", label: "Fed by" },
        ],
        rows: filtered.map((r) => ({
          date: r.fed_at,
          ration: r.feed_ration_name,
          qty: `${r.quantity} ${r.feed_ration_unit}`,
          location: r.location_label ?? "",
          group: r.cattle_group_name ?? "",
          owner: r.ownership_group_name ?? "",
          head: r.head_count,
          fed_by: r.fed_by_name ?? "",
        })),
      };
    }
    case "feedings_cow_calf": {
      const rows = await listFeedingRecords(orgId, { limit: 2000, context: "cow_calf" });
      const filtered = rows.filter((r) => inDateRange(r.fed_at, from, to));
      return {
        title: EXPORT_TYPE_LABELS.feedings_cow_calf,
        filename: `laors-feedings-cow-calf-${stamp()}`,
        columns: [
          { key: "date", label: "Date" },
          { key: "ration", label: "Ration" },
          { key: "qty", label: "Quantity" },
          { key: "location", label: "Pasture" },
          { key: "group", label: "Herd" },
          { key: "fed_by", label: "Fed by" },
        ],
        rows: filtered.map((r) => ({
          date: r.fed_at,
          ration: r.feed_ration_name,
          qty: `${r.quantity} ${r.feed_ration_unit}`,
          location: r.location_label ?? "",
          group: r.cattle_group_name ?? "",
          fed_by: r.fed_by_name ?? "",
        })),
      };
    }
    case "calving": {
      const rows = await listCalvingRecords(orgId);
      const filtered = rows.filter((r) => inDateRange(r.calved_at, from, to));
      return {
        title,
        filename,
        columns: [
          { key: "date", label: "Date" },
          { key: "dam", label: "Dam tag" },
          { key: "calf", label: "Calf tag" },
          { key: "sex", label: "Sex" },
          { key: "outcome", label: "Outcome" },
          { key: "weight", label: "Birth wt (lbs)" },
          { key: "group", label: "Group" },
          { key: "location", label: "Location" },
        ],
        rows: filtered.map((r) => ({
          date: r.calved_at,
          dam: r.dam_tag ?? "",
          calf: r.calf_tag ?? "",
          sex: r.calf_sex,
          outcome: r.outcome,
          weight: r.birth_weight_lbs,
          group: r.cattle_group_name ?? "",
          location: r.location_name ?? "",
        })),
      };
    }
    case "breeding": {
      const rows = await listBreedingRecords(orgId);
      const filtered = rows.filter((r) => inDateRange(r.bred_at, from, to));
      return {
        title,
        filename,
        columns: [
          { key: "bred", label: "Bred date" },
          { key: "dam", label: "Dam tag" },
          { key: "bull", label: "Bull" },
          { key: "method", label: "Method" },
          { key: "status", label: "Pregnancy" },
          { key: "due", label: "Expected calving" },
          { key: "group", label: "Group" },
        ],
        rows: filtered.map((r) => ({
          bred: r.bred_at,
          dam: r.dam_tag ?? "",
          bull: r.bull_tag ?? r.sire_tag ?? "",
          method: r.breeding_method,
          status: r.pregnancy_status,
          due: r.expected_calving_date ?? "",
          group: r.cattle_group_name ?? "",
        })),
      };
    }
    case "sales": {
      const rows = await listSales(orgId, 2000);
      const filtered = rows.filter((r) => inDateRange(r.sale_date, from, to));
      return {
        title,
        filename,
        columns: [
          { key: "date", label: "Date" },
          { key: "buyer", label: "Buyer" },
          { key: "head", label: "Head" },
          { key: "price", label: "Price/head" },
          { key: "total", label: "Total" },
          { key: "group", label: "Group" },
        ],
        rows: filtered.map((r) => ({
          date: r.sale_date,
          buyer: r.buyer_name ?? "",
          head: r.head_count,
          price: r.price_per_head,
          total: r.total_amount,
          group: r.cattle_group_name ?? "",
        })),
      };
    }
    case "invoices": {
      const rows = await listInvoices(orgId, 2000);
      const filtered = rows.filter((r) => inDateRange(r.invoice_date, from, to));
      return {
        title,
        filename,
        columns: [
          { key: "number", label: "Invoice #" },
          { key: "date", label: "Date" },
          { key: "customer", label: "Customer" },
          { key: "status", label: "Status" },
          { key: "subtotal", label: "Subtotal" },
        ],
        rows: filtered.map((r) => ({
          number: r.invoice_number,
          date: r.invoice_date,
          customer: r.customer_name,
          status: r.status,
          subtotal: r.subtotal,
        })),
      };
    }
    case "jobs": {
      const rows = await listTasks(orgId, "all");
      const filtered = rows.filter((r) =>
        r.due_date ? inDateRange(r.due_date, from, to) : !from && !to,
      );
      return {
        title,
        filename,
        columns: [
          { key: "title", label: "Task" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "due", label: "Due date" },
          { key: "location", label: "Location" },
          { key: "assignee", label: "Assigned to" },
        ],
        rows: filtered.map((r) => ({
          title: r.title,
          status: r.status,
          priority: r.priority,
          due: r.due_date ?? "",
          location: r.location_label ?? "",
          assignee: r.assigned_to_name ?? "",
        })),
      };
    }
    case "cattle_moves": {
      const supabase = await createClient();
      let query = supabase
        .from("cattle_movements")
        .select("moved_at, total_head, notes, status")
        .eq("organization_id", orgId)
        .is("voided_at", null)
        .order("moved_at", { ascending: false })
        .limit(2000);
      if (from) query = query.gte("moved_at", from);
      if (to) query = query.lte("moved_at", to);
      const { data } = await query;
      return {
        title,
        filename,
        columns: [
          { key: "date", label: "Date" },
          { key: "head", label: "Head" },
          { key: "status", label: "Status" },
          { key: "notes", label: "Notes" },
        ],
        rows: (data ?? []).map((r) => ({
          date: r.moved_at,
          head: r.total_head,
          status: r.status,
          notes: r.notes ?? "",
        })),
      };
    }
    case "maternal_fertility": {
      const dashboard = await getMaternalDashboard(orgId);
      return {
        title: EXPORT_TYPE_LABELS.maternal_fertility,
        filename: `laors-maternal-fertility-${stamp()}`,
        columns: [
          { key: "tag", label: "Tag" },
          { key: "name", label: "Name" },
          { key: "score", label: "Fertility score" },
          { key: "percentile", label: "Herd percentile" },
          { key: "trend", label: "Trend" },
          { key: "recommendation", label: "Recommendation" },
          { key: "calves_born", label: "Calves born" },
          { key: "calves_weaned", label: "Calves weaned" },
          { key: "open_years", label: "Open years" },
          { key: "interval", label: "Avg calving interval (days)" },
        ],
        rows: dashboard.fertilityScores.map((f) => ({
          tag: f.tag,
          name: f.name ?? "",
          score: f.score,
          percentile: f.percentile,
          trend: f.trend,
          recommendation: RETENTION_RECOMMENDATION_LABELS[f.recommendation],
          calves_born: f.factors.calvesBorn,
          calves_weaned: f.factors.calvesWeaned,
          open_years: f.factors.openYears,
          interval: f.factors.avgCalvingIntervalDays ?? "",
        })),
      };
    }
    case "maternal_calf_crop": {
      const dashboard = await getMaternalDashboard(orgId);
      return {
        title: EXPORT_TYPE_LABELS.maternal_calf_crop,
        filename: `laors-calf-crop-${stamp()}`,
        columns: [
          { key: "year", label: "Year" },
          { key: "born", label: "Calves born" },
          { key: "weaned", label: "Calves weaned" },
          { key: "mortality", label: "Mortality %" },
          { key: "replacements", label: "Replacement heifers" },
          { key: "loss_calving", label: "Loss: calving" },
          { key: "loss_disease", label: "Loss: disease" },
          { key: "loss_env", label: "Loss: environmental" },
        ],
        rows: dashboard.calfCropReports.map((r) => ({
          year: r.year,
          born: r.calvesBorn,
          weaned: r.calvesWeaned,
          mortality: r.mortalityRate,
          replacements: r.replacementHeifers,
          loss_calving: r.losses.calving_difficulty,
          loss_disease: r.losses.disease,
          loss_env: r.losses.environmental,
        })),
      };
    }
    case "maternal_calving_ease": {
      const dashboard = await getMaternalDashboard(orgId);
      return {
        title: EXPORT_TYPE_LABELS.maternal_calving_ease,
        filename: `laors-calving-ease-${stamp()}`,
        columns: [
          { key: "sire", label: "Sire" },
          { key: "epd_ce", label: "EPD calving ease" },
          { key: "expected", label: "Expected" },
          { key: "calvings", label: "Calvings" },
          { key: "assisted_pct", label: "Assisted %" },
          { key: "pull_pct", label: "Pull %" },
          { key: "csection_pct", label: "C-section %" },
          { key: "verdict", label: "Verdict" },
        ],
        rows: dashboard.sireCalvingEase.map((s) => ({
          sire: s.sireLabel,
          epd_ce: s.epdCalvingEase ?? "",
          expected: s.expectedPercentile ?? "",
          calvings: s.calvings,
          assisted_pct: s.assistedRate,
          pull_pct: s.pullRate,
          csection_pct: s.cSectionRate,
          verdict: s.verdict,
        })),
      };
    }
    case "weaning": {
      const rows = await listWeaningRecords(orgId, 2000);
      const filtered = rows.filter((r) => inDateRange(r.weaned_at, from, to));
      return {
        title: EXPORT_TYPE_LABELS.weaning,
        filename: `laors-weaning-${stamp()}`,
        columns: [
          { key: "date", label: "Weaned" },
          { key: "calf", label: "Calf tag" },
          { key: "dam", label: "Dam" },
          { key: "weight", label: "Weight (lbs)" },
          { key: "retained", label: "Retained heifer" },
          { key: "notes", label: "Notes" },
        ],
        rows: filtered.map((r) => ({
          date: r.weaned_at,
          calf: r.calf_tag ?? "",
          dam: r.dam_tag ?? "",
          weight: r.weaning_weight_lbs,
          retained: r.retained_as_heifer ? "Yes" : "No",
          notes: r.notes ?? "",
        })),
      };
    }
    default:
      throw new Error("Unknown export type");
  }
}
