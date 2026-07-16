import Link from "next/link";
import type { SeedstockAnimalRecord } from "@/lib/seedstock/types";
import { SEEDSTOCK_TYPE_LABELS } from "@/lib/seedstock/constants";

interface AnimalListProps {
  animals: SeedstockAnimalRecord[];
}

export function SeedstockAnimalList({ animals }: AnimalListProps) {
  if (animals.length === 0) {
    return (
      <p className="rounded-xl border border-border-neutral bg-surface-white px-4 py-8 text-center text-sm text-text-secondary">
        No seedstock animals yet — tap + Register to add your first.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {animals.map((animal) => (
        <li key={animal.id}>
          <Link
            href={`/seedstock/animals/${animal.id}`}
            className="flex items-center justify-between rounded-xl border border-border-neutral bg-surface-white px-4 py-4 transition-colors hover:border-navy hover:bg-tan/5"
          >
            <div>
              <p className="font-semibold text-navy">
                {animal.tag_number}
                {animal.name ? ` — ${animal.name}` : ""}
              </p>
              <p className="text-sm text-text-secondary">
                {SEEDSTOCK_TYPE_LABELS[animal.animal_type]}
                {animal.breed ? ` · ${animal.breed}` : ""}
                {animal.registration_number ? ` · ${animal.registration_number}` : ""}
              </p>
            </div>
            <span className="text-sm capitalize text-text-secondary">{animal.status}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
