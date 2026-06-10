import type { MaternalDataset, MaternalLifetimeValue } from "./types";
import { computeFertilityScores } from "./fertility-score";
import {
  calvingsForDam,
  descendantsOf,
  getFemaleAnimals,
  weaningForDam,
} from "./data";

function yearsInHerd(birthDate: string | null, calvings: string[]): number | null {
  if (!birthDate) return null;
  const end = calvings.length ? calvings.sort().reverse()[0] : new Date().toISOString().slice(0, 10);
  const months =
    (new Date(`${end}T12:00:00`).getFullYear() - new Date(`${birthDate}T12:00:00`).getFullYear()) *
      12 +
    (new Date(`${end}T12:00:00`).getMonth() - new Date(`${birthDate}T12:00:00`).getMonth());
  return Math.round((months / 12) * 10) / 10;
}

export function computeMaternalLifetimeValues(
  dataset: MaternalDataset,
): MaternalLifetimeValue[] {
  const fertilityMap = new Map(
    computeFertilityScores(dataset).map((f) => [f.animalId, f]),
  );

  return getFemaleAnimals(dataset).map((dam) => {
    const calvings = calvingsForDam(dataset, dam.id);
    const weaned = weaningForDam(dataset, dam.id);
    const children = descendantsOf(dataset, dam.id);
    const daughtersRetained = children.filter(
      (c) =>
        (c.animal_type === "cow" || c.animal_type === "heifer") && c.status === "active",
    ).length;

    const offspringIds = new Set(children.map((c) => c.id));
    const offspringRevenue = dataset.sales
      .filter((s) => s.individual_animal_id && offspringIds.has(s.individual_animal_id))
      .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

    const fertility = fertilityMap.get(dam.id);
    const liveCalvings = calvings.filter((c) => c.outcome === "live");
    const fertilityBonus = (fertility?.score ?? 50) * 200;
    const calfValue = liveCalvings.length * 1500 + weaned.length * 800;
    const retentionBonus = daughtersRetained * 2500;
    const longevityBonus = (yearsInHerd(dam.birth_date, calvings.map((c) => c.calved_at)) ?? 0) * 500;

    const lifetimeValue = Math.round(
      offspringRevenue + calfValue + retentionBonus + fertilityBonus + longevityBonus,
    );

    return {
      animalId: dam.id,
      tag: dam.tag_number,
      name: dam.name,
      lifetimeValue,
      calvesBorn: calvings.length,
      calvesWeaned: weaned.length,
      daughtersRetained,
      offspringRevenue: Math.round(offspringRevenue),
      yearsInHerd: yearsInHerd(dam.birth_date, calvings.map((c) => c.calved_at)),
      fertilityScore: fertility?.score ?? null,
    };
  }).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}
