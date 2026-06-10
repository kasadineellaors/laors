import type { ExportDataset } from "./types";

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function datasetToCsv(dataset: ExportDataset): string {
  const header = dataset.columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = dataset.rows.map((row) =>
    dataset.columns.map((c) => escapeCsvCell(row[c.key] ?? null)).join(","),
  );
  return [header, ...lines].join("\n");
}

export function csvResponse(dataset: ExportDataset): Response {
  const csv = datasetToCsv(dataset);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset.filename}.csv"`,
    },
  });
}
