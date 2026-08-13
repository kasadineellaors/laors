export interface PhysicalAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

export const EMPTY_PHYSICAL_ADDRESS: PhysicalAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
};

export function formatPhysicalAddress(parts: PhysicalAddress): string | null {
  const lines: string[] = [];
  if (parts.line1.trim()) lines.push(parts.line1.trim());
  if (parts.line2.trim()) lines.push(parts.line2.trim());
  const cityState = [parts.city.trim(), parts.state.trim()].filter(Boolean).join(", ");
  const cityLine = [cityState, parts.zip.trim()].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  return lines.length ? lines.join("\n") : null;
}

/** Best-effort parse of a stored multiline address into structured fields. */
export function parsePhysicalAddress(address: string | null | undefined): PhysicalAddress {
  if (!address?.trim()) return { ...EMPTY_PHYSICAL_ADDRESS };

  const lines = address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ...EMPTY_PHYSICAL_ADDRESS };
  if (lines.length === 1) {
    return { ...EMPTY_PHYSICAL_ADDRESS, line1: lines[0] };
  }

  const last = lines[lines.length - 1];
  const cityStateZip = last.match(/^(.+?),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (cityStateZip) {
    return {
      line1: lines[0],
      line2: lines.length > 2 ? lines.slice(1, -1).join("\n") : "",
      city: cityStateZip[1].trim(),
      state: cityStateZip[2].toUpperCase(),
      zip: cityStateZip[3],
    };
  }

  return { ...EMPTY_PHYSICAL_ADDRESS, line1: lines.join("\n") };
}
