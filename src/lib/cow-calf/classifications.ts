import type { ClassificationOption } from "./types";

/** Pick a sensible default classification when logging a calf. */
export function suggestCalfClassificationId(
  options: ClassificationOption[],
  calfSex: "bull_calf" | "heifer_calf" | "unknown",
): string {
  if (options.length === 0) return "";

  const byName = (pattern: RegExp) =>
    options.find((o) => pattern.test(o.name.toLowerCase()));

  if (calfSex === "heifer_calf") {
    return byName(/heifer|hf/)?.id ?? byName(/weaned|wc/)?.id ?? options[0]!.id;
  }
  if (calfSex === "bull_calf") {
    return byName(/steer|st|bull|bu/)?.id ?? byName(/weaned|wc/)?.id ?? options[0]!.id;
  }
  return byName(/weaned|wc|calf/)?.id ?? options[0]!.id;
}
