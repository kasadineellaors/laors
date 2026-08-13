import { convertFeedQuantity, formatFeedUnitLabel } from "@/lib/feed/units";
import type { BillingCategory, BillingLinePreview } from "./types";

export function formatHeadDays(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function formatTons(tons: number): string {
  return tons.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function parseBillingPeriod(notes: string | null): { start: string; end: string } | null {
  if (!notes) return null;
  const match = notes.match(/Billing period\s+(\d{4}-\d{2}-\d{2})\s+through\s+(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

export function formatBillingPeriodLabel(start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (start === end) return s.toLocaleDateString(undefined, opts);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : opts;
  return `${s.toLocaleDateString(undefined, startOpts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

/** Plain-language label for a billing category. */
export function categoryLabel(category: BillingCategory | null | undefined): string {
  switch (category) {
    case "yardage":
      return "Pen / yardage";
    case "pasture":
      return "Pasture";
    case "feed":
      return "Feed";
    case "treatments":
      return "Medicine & treatments";
    case "processing":
      return "Processing";
    case "misc":
      return "Misc charges";
    case "dead":
      return "Death loss (info only)";
    default:
      return "Charge";
  }
}

export function describeInvoiceLine(line: {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  category: BillingCategory | null;
}): string {
  if (line.category === "dead") {
    return `${line.quantity} head lost during billing period (not charged)`;
  }

  const cat = categoryLabel(line.category);
  const desc = line.description;

  if (line.category === "yardage" || line.category === "pasture") {
    if (line.quantity > 1 && line.unit_price > 0) {
      return `${cat}: ${formatHeadDays(line.quantity)} head-days × ${formatMoney(line.unit_price)}/day`;
    }
  }

  if (line.category === "feed" && line.quantity > 0 && line.unit_price > 0) {
    const rationTons = desc.match(/^Feed — (.+?) — ([\d,.]+) tons$/);
    if (rationTons) {
      return `Feed — ${rationTons[1]}: ${rationTons[2]} tons × ${formatMoney(line.unit_price)}/ton = ${formatMoney(line.line_total)}`;
    }
    if (desc.toLowerCase().includes("ton")) {
      return `${cat}: ${formatHeadDays(line.quantity)} tons delivered`;
    }
  }

  if (line.quantity === 1 && Math.abs(line.unit_price - line.line_total) < 0.01) {
    return `${cat}: ${desc}`;
  }

  return desc;
}

export function previewLineDetail(line: BillingLinePreview): string | null {
  if (line.category === "dead") return null;
  if (line.detail) return line.detail;

  if (
    (line.category === "yardage" || line.category === "pasture") &&
    line.quantity > 0 &&
    line.unitPrice > 0
  ) {
    return `${formatHeadDays(line.quantity)} head-days × ${formatMoney(line.unitPrice)}/day = ${formatMoney(line.quantity * line.unitPrice)}`;
  }

  if (line.category === "feed" && line.quantity > 0 && line.unitPrice > 0) {
    if (line.description.includes(" tons")) {
      return `${formatTons(line.quantity)} tons × ${formatMoney(line.unitPrice)}/ton = ${formatMoney(line.quantity * line.unitPrice)}`;
    }
    const unitMatch = line.description.match(/— [\d,.]+ (.+)$/);
    if (unitMatch && !line.description.includes("tons")) {
      const unitLabel = unitMatch[1].trim();
      return `${formatHeadDays(line.quantity)} ${unitLabel} × ${formatMoney(line.unitPrice)}/${unitLabel} = ${formatMoney(line.quantity * line.unitPrice)}`;
    }
    return `${formatTons(line.quantity)} tons × ${formatMoney(line.unitPrice)}/ton = ${formatMoney(line.quantity * line.unitPrice)}`;
  }

  if (line.quantity === 1) {
    return formatMoney(line.unitPrice);
  }

  return `${line.quantity} × ${formatMoney(line.unitPrice)} = ${formatMoney(line.quantity * line.unitPrice)}`;
}
