import type { InvoiceRecord } from "./types";

export interface InvoiceOrgInfo {
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
}

export interface InvoicePrintData {
  invoice: InvoiceRecord;
  org: InvoiceOrgInfo;
}

export function formatOrgAddress(org: InvoiceOrgInfo): string | null {
  const lines: string[] = [];
  if (org.addressLine1) lines.push(org.addressLine1);
  if (org.addressLine2) lines.push(org.addressLine2);
  const cityState = [org.city, org.state].filter(Boolean).join(", ");
  const cityLine = [cityState, org.zip].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines.length ? lines.join("\n") : null;
}
