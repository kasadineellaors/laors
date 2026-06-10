import type { MaternalDataset, SireCalvingEaseValidation } from "./types";

function isAssisted(
  assistance: string | null,
  ease: number | null,
): boolean {
  if (assistance === "easy_pull" || assistance === "hard_pull" || assistance === "c_section") {
    return true;
  }
  if (ease != null && ease >= 3) return true;
  return false;
}

function epdPercentileLabel(epd: number | null): string | null {
  if (epd == null) return null;
  if (epd >= 10) return "Top 10% calving ease";
  if (epd >= 5) return "Top 25% calving ease";
  if (epd >= 0) return "Above average";
  if (epd >= -5) return "Average";
  return "Below average";
}

export function computeSireCalvingEaseValidation(
  dataset: MaternalDataset,
): SireCalvingEaseValidation[] {
  const bySire = new Map<
    string,
    {
      bullId: string | null;
      label: string;
      epdCe: number | null;
      epdBw: number | null;
      calvings: MaternalDataset["calving"];
    }
  >();

  for (const c of dataset.calving) {
    const key = c.bull_id ?? c.sire_tag ?? "unknown";
    if (!bySire.has(key)) {
      const bull = c.bull_id ? dataset.animals.find((a) => a.id === c.bull_id) : null;
      bySire.set(key, {
        bullId: c.bull_id,
        label: bull
          ? bull.name
            ? `${bull.tag_number} — ${bull.name}`
            : bull.tag_number
          : c.sire_tag ?? "Unknown sire",
        epdCe: bull?.epd_calving_ease ?? null,
        epdBw: bull?.epd_birth_weight ?? null,
        calvings: [],
      });
    }
    bySire.get(key)!.calvings.push(c);
  }

  return [...bySire.entries()].map(([sireKey, group]) => {
    const n = group.calvings.length;
    const assisted = group.calvings.filter((c) =>
      isAssisted(c.assistance_type, c.calving_ease_score),
    ).length;
    const pulls = group.calvings.filter(
      (c) => c.assistance_type === "easy_pull" || c.assistance_type === "hard_pull",
    ).length;
    const cSections = group.calvings.filter((c) => c.assistance_type === "c_section").length;
    const easeScores = group.calvings
      .map((c) => c.calving_ease_score)
      .filter((s): s is number => s != null);
    const assistedRate = n > 0 ? Math.round((assisted / n) * 1000) / 10 : 0;
    const pullRate = n > 0 ? Math.round((pulls / n) * 1000) / 10 : 0;
    const cSectionRate = n > 0 ? Math.round((cSections / n) * 1000) / 10 : 0;
    const avgEase =
      easeScores.length > 0
        ? Math.round((easeScores.reduce((a, b) => a + b, 0) / easeScores.length) * 10) / 10
        : null;

    let verdict: SireCalvingEaseValidation["verdict"] = "insufficient_data";
    if (n >= 3) {
      const expectedGood = (group.epdCe ?? 0) >= 5;
      const actualBad = assistedRate > 15;
      const actualGood = assistedRate <= 8;
      if (expectedGood && actualBad) verdict = "worse_than_expected";
      else if (!expectedGood && actualGood) verdict = "better_than_expected";
      else verdict = "matches";
    }

    return {
      bullId: group.bullId,
      sireKey,
      sireLabel: group.label,
      epdCalvingEase: group.epdCe,
      epdBirthWeight: group.epdBw,
      expectedPercentile: epdPercentileLabel(group.epdCe),
      calvings: n,
      assistedCount: assisted,
      assistedRate,
      pullRate,
      cSectionRate,
      avgEaseScore: avgEase,
      verdict,
    };
  }).sort((a, b) => b.calvings - a.calvings);
}
