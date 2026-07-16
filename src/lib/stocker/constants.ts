/**
 * Stocker regression guards — pure constants and filters that must not change
 * when Cow-Calf enterprise features are added.
 */

/** Feeding context used for Stocker yardage and invoice billing. */
export const STOCKER_BILLING_FEEDING_CONTEXT = "general" as const;

/** Feeding context excluded from Stocker invoices (Cow-Calf pasture feed). */
export const COW_CALF_FEEDING_CONTEXT = "cow_calf" as const;

export function isStockerBillableFeedingContext(context: string | null | undefined): boolean {
  return context === STOCKER_BILLING_FEEDING_CONTEXT;
}

export function isCowCalfFeedingContext(context: string | null | undefined): boolean {
  return context === COW_CALF_FEEDING_CONTEXT;
}

/** Default enterprise type for received stocker lots — must remain stocker. */
export const DEFAULT_LOT_ENTERPRISE_TYPE = "stocker" as const;

export function isStockerLotEnterpriseType(enterpriseType: string | null | undefined): boolean {
  return (enterpriseType ?? DEFAULT_LOT_ENTERPRISE_TYPE) === DEFAULT_LOT_ENTERPRISE_TYPE;
}
