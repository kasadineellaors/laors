"use client";

import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import {
  updateLocationType,
  archiveLocationType,
  createLocationType,
} from "@/lib/actions/ranch-config";
import { LocationTypesForm } from "@/components/setup/location-types-form";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationTypesListProps {
  orgId: string;
  types: SelectOption[];
}

export function LocationTypesList({ orgId, types }: LocationTypesListProps) {
  const router = useRouter();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current types</CardTitle>
          <CardDescription>
            Property-tier types attach to the ranch. Location-tier types nest underneath.
          </CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {types.length === 0 ? (
            <li className="text-sm text-charcoal/60">No types yet</li>
          ) : (
            types.map((t) => (
              <SetupEditableRow
                key={t.value}
                badge={String(t.meta?.tier ?? "")}
                fields={[
                  { key: "name", label: "Name", value: t.label },
                  {
                    key: "pluralName",
                    label: "Plural name",
                    value: String(t.meta?.plural_name ?? `${t.label}s`),
                  },
                ]}
                onSave={async (values) => {
                  const result = await updateLocationType(
                    orgId,
                    t.value,
                    values.name,
                    values.pluralName,
                  );
                  if (!result.error) router.refresh();
                  return result;
                }}
                onArchive={async () => {
                  const result = await archiveLocationType(orgId, t.value);
                  if (!result.error) router.refresh();
                  return result;
                }}
              />
            ))
          )}
        </ul>
      </Card>

      <LocationTypesForm
        orgId={orgId}
        createAction={async (...args) => {
          const result = await createLocationType(...args);
          if (!result.error) router.refresh();
          return result;
        }}
      />
    </>
  );
}
