import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportDataset } from "./types";

export function datasetToPdfBuffer(dataset: ExportDataset): ArrayBuffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const margin = 40;

  doc.setFontSize(14);
  doc.text(dataset.title, margin, margin);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exported ${new Date().toLocaleString()}`, margin, margin + 16);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: margin + 28,
    head: [dataset.columns.map((c) => c.label)],
    body: dataset.rows.map((row) =>
      dataset.columns.map((c) => {
        const v = row[c.key];
        return v == null ? "" : String(v);
      }),
    ),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [74, 93, 35] },
    margin: { left: margin, right: margin },
  });

  return doc.output("arraybuffer") as ArrayBuffer;
}

export function pdfResponse(dataset: ExportDataset): Response {
  const buffer = datasetToPdfBuffer(dataset);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dataset.filename}.pdf"`,
    },
  });
}
