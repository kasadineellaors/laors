export function resolveInboundTotalWeight(
  payWeightLbs: number | null | undefined,
  shrunkWeightLbs: number | null | undefined,
  receivedWeightLbs: number | null | undefined,
): number | null {
  if (receivedWeightLbs != null && receivedWeightLbs > 0) return receivedWeightLbs;
  if (shrunkWeightLbs != null && shrunkWeightLbs > 0) return shrunkWeightLbs;
  if (payWeightLbs != null && payWeightLbs > 0) return payWeightLbs;
  return null;
}

export function computeAvgWeightIn(
  headCount: number,
  weights: {
    payWeightLbs?: number | null;
    shrunkWeightLbs?: number | null;
    receivedWeightLbs?: number | null;
  },
): number | null {
  if (headCount <= 0) return null;
  const total = resolveInboundTotalWeight(
    weights.payWeightLbs,
    weights.shrunkWeightLbs,
    weights.receivedWeightLbs,
  );
  return total != null ? total / headCount : null;
}

export function shrinkPct(
  fromLbs: number | null | undefined,
  toLbs: number | null | undefined,
): number | null {
  if (fromLbs == null || toLbs == null || fromLbs <= 0) return null;
  return ((fromLbs - toLbs) / fromLbs) * 100;
}

export function perHeadAvg(totalLbs: number | null | undefined, headCount: number): number | null {
  if (totalLbs == null || headCount <= 0) return null;
  return totalLbs / headCount;
}
