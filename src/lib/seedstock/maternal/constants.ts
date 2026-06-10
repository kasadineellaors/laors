export const CALVING_EASE_SCORE_LABELS: Record<number, string> = {
  1: "Unassisted (1)",
  2: "Minor assistance (2)",
  3: "Moderate pull (3)",
  4: "Hard pull (4)",
  5: "C-section / severe (5)",
};

export const ASSISTANCE_TYPE_LABELS = {
  unassisted: "Unassisted",
  easy_pull: "Easy pull",
  hard_pull: "Hard pull",
  c_section: "C-section",
  unknown: "Unknown",
} as const;

export type AssistanceType = keyof typeof ASSISTANCE_TYPE_LABELS;

export const LOSS_CAUSE_LABELS = {
  calving_difficulty: "Calving difficulty",
  disease: "Disease",
  environmental: "Environmental",
  unknown: "Unknown",
} as const;

export type LossCause = keyof typeof LOSS_CAUSE_LABELS;

export const FERTILITY_TREND_LABELS = {
  up: "Trending up",
  down: "Trending down",
  stable: "Stable",
} as const;

export const RETENTION_RECOMMENDATION_LABELS = {
  retain: "Retain — top performer",
  monitor: "Monitor — average",
  cull: "Consider culling",
  insufficient_data: "Need more records",
} as const;

export const CALVING_PERIOD_LABELS = {
  first_21: "First 21 days",
  second_21: "Days 22–42",
  third_21: "Days 43–63",
  late: "After day 63",
} as const;
