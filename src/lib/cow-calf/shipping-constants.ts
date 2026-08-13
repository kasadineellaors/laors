export const SHIPPING_REASONS = [
  "transfer",
  "grazing_lease",
  "feedyard",
  "sale_barn",
  "return_to_owner",
  "other",
] as const;

export type ShippingReason = (typeof SHIPPING_REASONS)[number];

export const SHIPPING_REASON_LABELS: Record<ShippingReason, string> = {
  transfer: "Transfer",
  grazing_lease: "Grazing lease",
  feedyard: "Feedyard",
  sale_barn: "Sale barn",
  return_to_owner: "Return to owner",
  other: "Other",
};

export const SHIPPING_DIRECTIONS = ["in", "out"] as const;
export type ShippingDirection = (typeof SHIPPING_DIRECTIONS)[number];

export const SHIPPING_DIRECTION_LABELS: Record<ShippingDirection, string> = {
  in: "In",
  out: "Out",
};
