import { buildExportDataset } from "@/lib/export/data";
import { csvResponse } from "@/lib/export/csv";
import { pdfResponse } from "@/lib/export/pdf";
import type { ExportFormat, ExportRecordType } from "@/lib/export/types";
import { PERMISSIONS } from "@/lib/permissions/roles";
import { AuthGuardError, assertOptionalDateRange, authorizeApi } from "@/lib/auth/guards";

const VALID_TYPES: ExportRecordType[] = [
  "treatments",
  "feedings",
  "feedings_cow_calf",
  "calving",
  "breeding",
  "sales",
  "invoices",
  "jobs",
  "cattle_moves",
  "maternal_fertility",
  "maternal_calf_crop",
  "maternal_calving_ease",
  "weaning",
  "weaning_cow_calf",
  "cow_calf_sales",
  "cow_calf_loss",
  "cow_calf_activity",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as ExportRecordType | null;
  const format = (searchParams.get("format") ?? "csv") as ExportFormat;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const orgId = searchParams.get("orgId");

  if (!type || !VALID_TYPES.includes(type)) {
    return new Response("Invalid export type", { status: 400 });
  }
  if (format !== "csv" && format !== "pdf") {
    return new Response("Invalid format", { status: 400 });
  }
  if (!orgId) {
    return new Response("Missing orgId", { status: 400 });
  }

  try {
    assertOptionalDateRange(from, to);
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return new Response(e.message, { status: e.status });
    }
    return new Response("Invalid date range", { status: 400 });
  }

  const auth = await authorizeApi(orgId, PERMISSIONS.REPORTS_EXPORT);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const dataset = await buildExportDataset(orgId, type, from, to);
    return format === "pdf" ? pdfResponse(dataset) : csvResponse(dataset);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return new Response(message, { status: 500 });
  }
}
