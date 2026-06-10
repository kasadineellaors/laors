import Link from "next/link";
import type { SeedstockAnimalRecord } from "@/lib/seedstock/types";
import { SEEDSTOCK_TYPE_LABELS } from "@/lib/seedstock/constants";

interface AnimalListProps {
  animals: SeedstockAnimalRecord[];
}

export function SeedstockAnimalList({ animals }: AnimalListProps) {
  if (animals.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-charcoal/60">
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
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:border-olive hover:bg-olive/5"
          >
            <div>
              <p className="font-semibold text-charcoal">
                {animal.tag_number}
                {animal.name ? ` — ${animal.name}` : ""}
              </p>
              <p className="text-sm text-charcoal/60">
                {SEEDSTOCK_TYPE_LABELS[animal.animal_type]}
                {animal.breed ? ` · ${animal.breed}` : ""}
                {animal.registration_number ? ` · ${animal.registration_number}` : ""}
              </p>
            </div>
            <span className="text-sm capitalize text-charcoal/50">{animal.status}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
