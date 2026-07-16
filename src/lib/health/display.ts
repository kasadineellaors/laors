/** Normalize medicine unit labels for display (prefer mL over cc). */
export function formatMedicineUnit(unit: string | null | undefined): string {
  const raw = unit?.trim() || "dose";
  if (raw.toLowerCase() === "cc") return "mL";
  if (raw.toLowerCase() === "ml") return "mL";
  return raw;
}

export function formatQuantityWithUnit(quantity: number, unit: string | null | undefined): string {
  return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${formatMedicineUnit(unit)}`;
}

export function costLabelForUnit(unit: string | null | undefined): string {
  const u = formatMedicineUnit(unit);
  if (u === "mL") return "Billing rate per mL";
  return `Billing rate per ${u}`;
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isWithdrawalActive(withdrawalUntil: string | null): boolean {
  if (!withdrawalUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return withdrawalUntil >= today;
}

export function calculateWithdrawalEndDate(
  treatmentDate: string,
  withdrawalDays: number,
): string {
  const end = new Date(`${treatmentDate}T12:00:00`);
  end.setDate(end.getDate() + withdrawalDays);
  return end.toISOString().slice(0, 10);
}

export function formatWithdrawalStatus(withdrawalUntil: string | null): {
  label: string;
  active: boolean;
} | null {
  if (!withdrawalUntil) return null;
  const active = isWithdrawalActive(withdrawalUntil);
  const through = formatShortDate(withdrawalUntil);
  return {
    label: active ? `Withdrawal through ${through}` : `Eligible for sale since ${through}`,
    active,
  };
}

export function formatDoseLine(
  quantityUsed: number | null,
  headCount: number | null,
  unit: string | null | undefined,
): string | null {
  if (quantityUsed == null) return null;
  const u = formatMedicineUnit(unit);
  if (headCount != null && headCount > 0) {
    const perHead = quantityUsed / headCount;
    const perHeadStr = perHead.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `${perHeadStr} ${u}/head · ${quantityUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${u} total`;
  }
  return `${quantityUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${u} total`;
}
