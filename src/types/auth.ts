export const SYSTEM_ROLES = [
  "owner",
  "manager",
  "worker",
  "accountant",
  "veterinarian",
  "viewer",
  "stocker_owner",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const OPERATION_MODES = ["cow_calf", "stocker", "seedstock"] as const;

export type OperationMode = (typeof OPERATION_MODES)[number];

export const OPERATION_MODE_LABELS: Record<OperationMode, string> = {
  cow_calf: "Cow-Calf",
  stocker: "Stocker",
  seedstock: "Seedstock",
};

export const OPERATION_MODE_DESCRIPTIONS: Record<OperationMode, string> = {
  cow_calf: "Herds, pairs, breeding, calving, weaning, and ranch foreman checks.",
  stocker: "Lots, receive cattle, moves, feed billing, sales, and closeouts.",
  seedstock: "Registered animals, EPDs, maternal records, and seedstock sales.",
};

export const ONBOARDING_STEPS = [
  "ranch",
  "modes",
  "location_types",
  "first_property",
  "first_locations",
  "team",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  ranch: "Ranch Name",
  modes: "Operation Modes",
  location_types: "Location Types",
  first_property: "First Property",
  first_locations: "First Locations",
  team: "Invite Team",
};
