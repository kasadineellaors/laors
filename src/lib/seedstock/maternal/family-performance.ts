import type { CowFamilyProfile, MaternalDataset } from "./types";
import { computeFertilityScores } from "./fertility-score";
import { descendantsOf, getFemaleAnimals } from "./data";

function isAssisted(assistance: string | null, ease: number | null): boolean {
  if (assistance && assistance !== "unassisted") return true;
  if (ease != null && ease >= 3) return true;
  return false;
}

export function computeFamilyProfiles(dataset: MaternalDataset): CowFamilyProfile[] {
  const fertilityMap = new Map(
    computeFertilityScores(dataset).map((f) => [f.animalId, f]),
  );
  const females = getFemaleAnimals(dataset);

  return females.map((dam) => {
    const children = descendantsOf(dataset, dam.id);
    const daughters = children.filter((c) => c.animal_type === "cow" || c.animal_type === "heifer");
    const sons = children.filter((c) => c.animal_type === "bull" || c.animal_type === "steer");
    const granddaughters = daughters.flatMap((d) =>
      descendantsOf(dataset, d.id).filter(
        (g) => g.animal_type === "cow" || g.animal_type === "heifer",
      ),
    );

    const daughterFertility = daughters
      .map((d) => fertilityMap.get(d.id)?.score)
      .filter((s): s is number => s != null);
    const daughterBreeding = daughters.flatMap((d) =>
      dataset.breeding.filter((b) => b.dam_id === d.id),
    );
    const daughterConfirmed = daughterBreeding.filter(
      (b) => b.pregnancy_status === "confirmed" || b.pregnancy_status === "bred",
    );

    const sonSales = sons.flatMap((s) =>
      dataset.sales.filter((sale) => sale.individual_animal_id === s.id),
    );
    const sonPrices = sonSales
      .map((s) => s.total_amount)
      .filter((a): a is number => a != null);

    const ggFertility = granddaughters
      .map((g) => fertilityMap.get(g.id)?.score)
      .filter((s): s is number => s != null);
    const ggRetained = granddaughters.filter((g) => g.status === "active").length;

    const offspringIds = new Set(children.map((c) => c.id));
    const offspringRevenue = dataset.sales
      .filter((s) => s.individual_animal_id && offspringIds.has(s.individual_animal_id))
      .reduce((sum, s) => sum + (s.total_amount ?? 0), 0);

    const daughtersRetained = daughters.filter((d) => d.status === "active").length;

    return {
      damId: dam.id,
      damTag: dam.tag_number,
      damName: dam.name,
      daughters: {
        count: daughters.length,
        conceptionRate:
          daughterBreeding.length > 0
            ? Math.round((daughterConfirmed.length / daughterBreeding.length) * 1000) / 10
            : null,
        avgFertilityScore:
          daughterFertility.length > 0
            ? Math.round(
                daughterFertility.reduce((a, b) => a + b, 0) / daughterFertility.length,
              )
            : null,
        avgSalePrice: null,
        marketed: daughters.filter((d) => d.status === "sold").length,
        retained: daughtersRetained,
        longevityYears: null,
      },
      sons: {
        count: sons.length,
        conceptionRate: null,
        avgFertilityScore: null,
        avgSalePrice:
          sonPrices.length > 0
            ? Math.round(sonPrices.reduce((a, b) => a + b, 0) / sonPrices.length)
            : null,
        marketed: sonSales.length,
        retained: sons.filter((s) => s.status === "active").length,
        longevityYears: null,
      },
      granddaughters: {
        count: granddaughters.length,
        conceptionRate: null,
        avgFertilityScore:
          ggFertility.length > 0
            ? Math.round(ggFertility.reduce((a, b) => a + b, 0) / ggFertility.length)
            : null,
        avgSalePrice: null,
        marketed: granddaughters.filter((g) => g.status === "sold").length,
        retained: ggRetained,
        longevityYears: null,
      },
      totalOffspringRevenue: Math.round(offspringRevenue),
    };
  });
}

export function getFamilyProfileForDam(
  dataset: MaternalDataset,
  damId: string,
): CowFamilyProfile | null {
  return computeFamilyProfiles(dataset).find((p) => p.damId === damId) ?? null;
}
