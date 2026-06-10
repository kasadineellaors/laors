import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoicePrintData } from "./print-types";
import { formatOrgAddress } from "./print-types";

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function invoiceToPdfBuffer(data: InvoicePrintData): ArrayBuffer {
  const { invoice, org } = data;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.setTextColor(74, 93, 35);
  doc.text(org.name, margin, y);
  doc.setTextColor(0);

  y += 20;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const orgAddress = formatOrgAddress(org);
  if (orgAddress) {
    orgAddress.split("\n").forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });
  }
  if (org.phone) {
    doc.text(org.phone, margin, y);
    y += 12;
  }
  doc.setTextColor(0);

  doc.setFontSize(22);
  doc.text("INVOICE", 420, margin);
  doc.setFontSize(10);
  doc.text(invoice.invoice_number, 420, margin + 18);
  doc.text(`Date: ${formatDate(invoice.invoice_date)}`, 420, margin + 32);
  if (invoice.due_date) {
    doc.text(`Due: ${formatDate(invoice.due_date)}`, 420, margin + 46);
  }

  y = Math.max(y + 16, margin + 72);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", margin, y);
  doc.setFont("helvetica", "normal");
  y += 16;
  doc.setFontSize(10);
  doc.text(invoice.customer_name, margin, y);
  y += 14;
  if (invoice.customer_email) {
    doc.text(invoice.customer_email, margin, y);
    y += 14;
  }
  if (invoice.customer_address) {
    invoice.customer_address.split("\n").forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });
  }

  autoTable(doc, {
    startY: y + 12,
    head: [["Description", "Qty", "Unit price", "Amount"]],
    body: invoice.lines.map((line) => [
      line.description,
      String(line.quantity),
      formatMoney(line.unit_price),
      formatMoney(line.line_total),
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [74, 93, 35] },
    columnStyles: {
      0: { cellWidth: 240 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 80;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatMoney(invoice.subtotal)}`, 420, finalY + 24, { align: "right" });

  if (invoice.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text("Notes", margin, finalY + 48);
    doc.text(invoice.notes, margin, finalY + 62, { maxWidth: 500 });
    doc.setTextColor(0);
  }

  return doc.output("arraybuffer") as ArrayBuffer;
}

export function invoicePdfBase64(data: InvoicePrintData): string {
  const buffer = invoiceToPdfBuffer(data);
  return Buffer.from(buffer).toString("base64");
}
