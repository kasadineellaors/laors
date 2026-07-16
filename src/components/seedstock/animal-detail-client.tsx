"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SelectOption } from "@/lib/locations/options";
import type { BreedingRecord } from "@/lib/cow-calf/breeding-types";
import type { SaleRecord } from "@/lib/sales/types";
import type { SeedstockAnimalRecord } from "@/lib/seedstock/types";
import {
  ANIMAL_STATUS_LABELS,
  SEEDSTOCK_SALE_TYPE_LABELS,
  SEEDSTOCK_TYPE_LABELS,
} from "@/lib/seedstock/constants";
import { archiveSeedstockAnimal } from "@/lib/actions/seedstock-animals";
import type { FertilityScoreResult, MaternalLifetimeValue } from "@/lib/seedstock/maternal/types";
import { BreedingList } from "@/components/cow-calf/breeding-list";
import { MaternalAnimalCard } from "@/components/seedstock/maternal-animal-card";
import { SeedstockAnimalForm } from "@/components/seedstock/animal-form";
import { Button } from "@/components/ui/button";

interface SeedstockAnimalDetailClientProps {
  orgId: string;
  animal: SeedstockAnimalRecord;
  breedingRecords: BreedingRecord[];
  salesRecords: SaleRecord[];
  fertility?: FertilityScoreResult | null;
  lifetime?: MaternalLifetimeValue | null;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  canManage: boolean;
}

function formatEpd(value: number | null) {
  return value != null ? value.toFixed(1) : "—";
}

function formatSaleDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SeedstockAnimalDetailClient({
  orgId,
  animal,
  breedingRecords,
  salesRecords,
  fertility = null,
  lifetime = null,
  locationOptions,
  groupOptions,
  canManage,
}: SeedstockAnimalDetailClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFemale = animal.animal_type === "cow" || animal.animal_type === "heifer";
  const breedingNewHref = isFemale
    ? `/seedstock/breeding/new?damId=${animal.id}`
    : `/seedstock/breeding/new?sireId=${animal.id}`;

  async function handleArchive() {
    if (!confirm("Archive this animal record?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveSeedstockAnimal(orgId, animal.id);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/seedstock/animals");
  }

  if (editing) {
    return (
      <SeedstockAnimalForm
        orgId={orgId}
        animal={animal}
        locationOptions={locationOptions}
        groupOptions={groupOptions}
        onSuccess={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  const epdFields = [
    { label: "Birth wt", value: formatEpd(animal.epd_birth_weight) },
    { label: "Weaning wt", value: formatEpd(animal.epd_weaning_weight) },
    { label: "Yearling wt", value: formatEpd(animal.epd_yearling_weight) },
    { label: "Milk", value: formatEpd(animal.epd_milk) },
    { label: "CEA", value: formatEpd(animal.epd_cea) },
    { label: "DOC", value: formatEpd(animal.epd_doc) },
    { label: "Scrotal", value: formatEpd(animal.epd_scrotal) },
    { label: "Marbling", value: formatEpd(animal.epd_marbling) },
    ...(animal.animal_type === "bull"
      ? [{ label: "Calving ease", value: formatEpd(animal.epd_calving_ease) }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Link href="/seedstock/animals" className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
        ← Animals
      </Link>

      <div className="rounded-xl border border-border-neutral bg-surface-white px-4 py-5">
        <p className="text-sm text-text-secondary">{SEEDSTOCK_TYPE_LABELS[animal.animal_type]}</p>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          {animal.tag_number}
          {animal.name ? ` — ${animal.name}` : ""}
        </h1>
        <p className="mt-1 text-sm capitalize text-text-secondary">
          {ANIMAL_STATUS_LABELS[animal.status]}
        </p>

        <dl className="mt-6 space-y-3 border-t border-border-neutral pt-4 text-sm">
          {animal.registration_number ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Registration</dt>
              <dd className="font-medium text-navy">{animal.registration_number}</dd>
            </div>
          ) : null}
          {animal.breed ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Breed</dt>
              <dd className="font-medium text-navy">{animal.breed}</dd>
            </div>
          ) : null}
          {animal.birth_date ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Born</dt>
              <dd className="font-medium text-navy">{animal.birth_date}</dd>
            </div>
          ) : null}
          {animal.sire_tag ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Sire</dt>
              <dd className="font-medium text-navy">{animal.sire_tag}</dd>
            </div>
          ) : null}
          {animal.dam_tag ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Dam</dt>
              <dd className="font-medium text-navy">{animal.dam_tag}</dd>
            </div>
          ) : null}
          {animal.location_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Location</dt>
              <dd className="font-medium text-navy">{animal.location_name}</dd>
            </div>
          ) : null}
          {animal.cattle_group_name ? (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Herd</dt>
              <dd className="font-medium text-navy">{animal.cattle_group_name}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 border-t border-border-neutral pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">EPDs</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {epdFields.map((epd) => (
              <div key={epd.label} className="rounded-lg bg-cream px-3 py-2 text-center">
                <p className="text-lg font-bold text-brown">{epd.value}</p>
                <p className="text-xs text-text-secondary">{epd.label}</p>
              </div>
            ))}
          </div>
        </div>

        {animal.pedigree ? (
          <p className="mt-4 border-t border-border-neutral pt-4 text-sm text-text-primary/80">{animal.pedigree}</p>
        ) : null}
        {animal.notes ? (
          <p className="mt-4 text-sm text-text-secondary">{animal.notes}</p>
        ) : null}
      </div>

      {isFemale && (fertility || lifetime) ? (
        <MaternalAnimalCard fertility={fertility} lifetime={lifetime} />
      ) : null}

      {isFemale && canManage ? (
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/seedstock/calving/new?damId=${animal.id}`}>
            <Button variant="secondary" fullWidth size="lg">
              + Calving
            </Button>
          </Link>
          <Link href={`/seedstock/exposure/new?damId=${animal.id}`}>
            <Button variant="secondary" fullWidth size="lg">
              + Exposure
            </Button>
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Breeding</h2>
          {canManage ? (
            <Link href={breedingNewHref} className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
              + Record
            </Link>
          ) : null}
        </div>
        <BreedingList
          records={breedingRecords}
          detailHrefPrefix="/seedstock/breeding"
          emptyMessage="No breeding records for this animal."
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">Sales</h2>
          {canManage && animal.status === "active" ? (
            <Link
              href={`/sales/new?animalId=${animal.id}`}
              className="text-sm font-medium text-brown hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
            >
              + Record sale
            </Link>
          ) : null}
        </div>
        {salesRecords.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
            No sales linked to this animal yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {salesRecords.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/sales/${sale.id}`}
                  className="block rounded-xl border border-border-neutral bg-surface-white px-4 py-3 hover:border-navy/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy">
                        {sale.seedstock_sale_type
                          ? SEEDSTOCK_SALE_TYPE_LABELS[sale.seedstock_sale_type]
                          : "Sale"}
                        {sale.buyer_name ? ` · ${sale.buyer_name}` : ""}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {sale.customer_name ? `${sale.customer_name} · ` : ""}
                        {sale.total_amount != null
                          ? `$${sale.total_amount.toLocaleString()}`
                          : "Amount not set"}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-text-secondary">
                      {formatSaleDate(sale.sale_date)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage ? (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" onClick={() => setEditing(true)} disabled={loading}>
            Edit
          </Button>
          {animal.status === "active" ? (
            <Link href={`/sales/new?animalId=${animal.id}`}>
              <Button variant="secondary" size="lg" fullWidth>
                Record sale
              </Button>
            </Link>
          ) : (
            <Button variant="secondary" size="lg" disabled>
              Sold
            </Button>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <Button variant="danger" fullWidth onClick={handleArchive} disabled={loading}>
          Archive animal
        </Button>
      ) : null}
    </div>
  );
}
