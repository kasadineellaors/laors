"use client";

import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import {
  updateLocationType,
  archiveLocationType,
  createLocationType,
} from "@/lib/actions/ranch-config";
import { BILLING_RATE_MODE_OPTIONS } from "@/lib/locations/billing-mode";
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
            Property-tier types attach to the ranch. Location-tier types nest underneath — set
            whether pens bill as pasture or yardage.
          </CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {types.length === 0 ? (
            <li className="text-sm text-text-secondary">No types yet</li>
          ) : (
            types.map((t) => {
              const isLocationTier = t.meta?.tier === "location";
              const billingMode = String(t.meta?.billing_rate_mode ?? "yardage");
              const fields = [
                { key: "name", label: "Name", value: t.label },
                {
                  key: "pluralName",
                  label: "Plural name",
                  value: String(t.meta?.plural_name ?? `${t.label}s`),
                },
                ...(isLocationTier
                  ? [
                      {
                        key: "billingRateMode",
                        label: "Billing rate",
                        value: billingMode,
                        type: "select" as const,
                        options: BILLING_RATE_MODE_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        })),
                      },
                    ]
                  : []),
              ];
              return (
              <SetupEditableRow
                key={t.value}
                badge={String(t.meta?.tier ?? "")}
                fields={fields}
                onSave={async (values) => {
                  const result = await updateLocationType(
                    orgId,
                    t.value,
                    values.name,
                    values.pluralName,
                    isLocationTier
                      ? (values.billingRateMode as "pasture" | "yardage")
                      : undefined,
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
            );
            })
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
