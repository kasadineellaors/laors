export type SeedstockAnimalType = "bull" | "cow" | "heifer" | "steer" | "other";

export type AnimalStatus = "active" | "sold" | "dead" | "archived";

export interface SeedstockAnimalRecord {
  id: string;
  tag_number: string;
  name: string | null;
  registration_number: string | null;
  animal_type: SeedstockAnimalType;
  breed: string | null;
  birth_date: string | null;
  sire_tag: string | null;
  dam_tag: string | null;
  pedigree: string | null;
  epd_birth_weight: number | null;
  epd_weaning_weight: number | null;
  epd_yearling_weight: number | null;
  epd_milk: number | null;
  epd_cea: number | null;
  epd_doc: number | null;
  epd_scrotal: number | null;
  epd_marbling: number | null;
  epd_calving_ease: number | null;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  location_id: string | null;
  location_name: string | null;
  status: AnimalStatus;
  notes: string | null;
}

export interface SeedstockSummary {
  total: number;
  active: number;
  bulls: number;
  females: number;
}
