/** Weighted-average inventory cost after a purchase receipt. */
export function weightedAverageCost(
  currentQty: number,
  currentPrice: number | null,
  receivedQty: number,
  receivedUnitCost: number,
): number {
  const totalQty = currentQty + receivedQty;
  if (totalQty <= 0) return receivedUnitCost;
  const existingValue = (currentPrice ?? 0) * currentQty;
  const newValue = receivedUnitCost * receivedQty;
  return (existingValue + newValue) / totalQty;
}

export interface RecipeIngredientCost {
  quantity_per_ration_unit: number;
  price_per_unit: number | null;
  inclusion_percent?: number | null;
}

/** Sum ingredient costs for one ration unit. */
export function computeRationRecipeCost(ingredients: RecipeIngredientCost[]): number {
  return ingredients.reduce((sum, i) => {
    const price = i.price_per_unit ?? 0;
    return sum + Number(i.quantity_per_ration_unit) * price;
  }, 0);
}

/** Resolve bill rate: manual price, else recipe cost from ingredients. */
export function resolveRationUnitPrice(
  manualPrice: number | null,
  ingredients: RecipeIngredientCost[],
): number {
  if (manualPrice != null && manualPrice > 0) return manualPrice;
  const recipe = computeRationRecipeCost(ingredients);
  return recipe > 0 ? recipe : 0;
}

/** Convert inclusion % to quantity per 1 ration unit (e.g. 25% → 0.25 tons per ton). */
export function inclusionToQuantity(inclusionPercent: number): number {
  return inclusionPercent / 100;
}
