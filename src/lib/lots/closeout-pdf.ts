import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LotCloseoutPrintData } from "./closeout-report";

export function closeoutToPdfBuffer(data: LotCloseoutPrintData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.setTextColor(74, 93, 35);
  doc.text(data.orgName, margin, y);
  doc.setTextColor(0);

  y += 24;
  doc.setFontSize(16);
  doc.text("Lot Closeout", margin, y);
  y += 20;
  doc.setFontSize(12);
  doc.text(data.lotLabel, margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(data.subtitle, margin, y);
  doc.setTextColor(0);

  y += 8;
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, y);

  for (const section of data.sections) {
    y += 28;
    if (y > 680) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 180, textColor: [100, 100, 100] },
        1: { halign: "right", fontStyle: "bold" },
      },
      body: section.rows.map((row) => [row.label, row.value]),
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  y += 24;
  if (y > 700) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const netLabel = data.netProfit >= 0 ? "Net profit" : "Net loss";
  doc.setTextColor(data.netProfit >= 0 ? 74 : 180, data.netProfit >= 0 ? 93 : 58, data.netProfit >= 0 ? 35 : 42);
  doc.text(
    `${netLabel}: ${data.netProfit.toLocaleString(undefined, { style: "currency", currency: "USD" })}`,
    margin,
    y,
  );

  return doc.output("arraybuffer");
}

export function closeoutPdfBase64(data: LotCloseoutPrintData): string {
  const buffer = closeoutToPdfBuffer(data);
  return Buffer.from(buffer).toString("base64");
}
