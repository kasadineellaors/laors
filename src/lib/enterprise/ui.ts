import type { OperationMode } from "@/types/auth";

export type EnterpriseUiContext = "stocker" | "cow_calf" | "seedstock" | "ranch";

export function hasStockerMode(modes: OperationMode[] | string[] | null | undefined): boolean {
  return Boolean(modes?.includes("stocker"));
}

export function hasCowCalfMode(modes: OperationMode[] | string[] | null | undefined): boolean {
  return Boolean(modes?.includes("cow_calf"));
}

export function hasSeedstockMode(modes: OperationMode[] | string[] | null | undefined): boolean {
  return Boolean(modes?.includes("seedstock"));
}

export function enterpriseCount(modes: OperationMode[]): number {
  return modes.filter((m) => m === "stocker" || m === "cow_calf" || m === "seedstock").length;
}

export function showEnterpriseSwitcher(modes: OperationMode[]): boolean {
  return hasStockerMode(modes) && hasCowCalfMode(modes);
}

/** Path-based active enterprise — presentation only, no stored state. */
export function activeEnterpriseFromPath(pathname: string): EnterpriseUiContext | null {
  if (pathname.startsWith("/cow-calf")) return "cow_calf";
  if (pathname.startsWith("/seedstock")) return "seedstock";
  if (pathname.startsWith("/cattle")) return "stocker";
  return null;
}

export const ENTERPRISE_UI_LABELS: Record<EnterpriseUiContext, string> = {
  stocker: "Stocker",
  cow_calf: "Cow-Calf",
  seedstock: "Seedstock",
  ranch: "Ranch-Wide",
};

export const ENTERPRISE_OVERVIEW_HREFS: Record<Exclude<EnterpriseUiContext, "ranch">, string> = {
  stocker: "/cattle",
  cow_calf: "/cow-calf",
  seedstock: "/seedstock",
};

/** Cattle tab destination when both stocker and cow-calf are enabled. */
export function cattleNavHref(pathname: string, modes: OperationMode[]): string {
  if (hasCowCalfMode(modes) && !hasStockerMode(modes)) return "/cow-calf";
  if (pathname.startsWith("/cow-calf")) return "/cow-calf";
  return "/cattle";
}

export function cattleNavIsActive(pathname: string): boolean {
  return pathname.startsWith("/cattle") || pathname.startsWith("/cow-calf");
}
