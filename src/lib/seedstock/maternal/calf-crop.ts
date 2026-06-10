import type { CalfCropYearReport, MaternalDataset } from "./types";
import { resolveDamId } from "./data";

export function computeCalfCropReports(dataset: MaternalDataset): CalfCropYearReport[] {
  const seedstockCalvings = dataset.calving.filter((c) => {
    const damId = resolveDamId(dataset, c.dam_id, c.dam_tag);
    return damId != null;
  });

  const years = [...new Set(seedstockCalvings.map((c) => c.calved_at.slice(0, 4)))].sort().reverse();

  return years.map((yearStr) => {
    const year = Number(yearStr);
    const calvings = seedstockCalvings.filter((c) => c.calved_at.startsWith(yearStr));
    const weanings = dataset.weaning.filter((w) => w.weaned_at.startsWith(yearStr));
    const born = calvings.length;
    const live = calvings.filter((c) => c.outcome === "live").length;
    const dead = calvings.filter((c) => c.outcome !== "live").length;
    const weaned = weanings.length;
    const mortalityRate = born > 0 ? Math.round((dead / born) * 1000) / 10 : 0;

    const losses = {
      calving_difficulty: calvings.filter((c) => c.loss_cause === "calving_difficulty").length,
      disease: calvings.filter((c) => c.loss_cause === "disease").length,
      environmental: calvings.filter((c) => c.loss_cause === "environmental").length,
      unknown: calvings.filter(
        (c) => c.outcome !== "live" && (!c.loss_cause || c.loss_cause === "unknown"),
      ).length,
    };

    const replacementHeifers = weanings.filter((w) => w.retained_as_heifer).length;

    const yearSales = dataset.sales.filter((s) => s.sale_date.startsWith(yearStr));
    const bullsSold = yearSales.filter(
      (s) => s.seedstock_sale_type === "live_animal" && s.individual_animal_id,
    ).length;
    const femalesSold = yearSales.filter((s) => {
      if (!s.individual_animal_id) return false;
      const animal = dataset.animals.find((a) => a.id === s.individual_animal_id);
      return animal?.animal_type === "cow" || animal?.animal_type === "heifer";
    }).length;

    const activeFemales = dataset.animals.filter(
      (a) =>
        (a.animal_type === "cow" || a.animal_type === "heifer") && a.status === "active",
    ).length;
    const culled = dataset.animals.filter(
      (a) =>
        (a.animal_type === "cow" || a.animal_type === "heifer") &&
        (a.status === "sold" || a.status === "dead") &&
        a.birth_date?.startsWith(String(year - 10)),
    ).length;

    return {
      year,
      calvesBorn: born,
      calvesWeaned: weaned || live,
      mortalityRate,
      replacementHeifers,
      bullsSold,
      femalesSold,
      cullPercent:
        activeFemales + culled > 0
          ? Math.round((culled / (activeFemales + culled)) * 1000) / 10
          : null,
      losses,
    };
  });
}
