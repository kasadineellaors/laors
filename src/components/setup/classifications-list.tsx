"use client";

import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import {
  createClassification,
  updateClassification,
  archiveClassification,
} from "@/lib/actions/ranch-config";
import { ClassificationForm } from "@/components/setup/classification-form";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassificationsListProps {
  orgId: string;
  classifications: SelectOption[];
}

export function ClassificationsList({ orgId, classifications }: ClassificationsListProps) {
  const router = useRouter();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current cattle types</CardTitle>
          <CardDescription>Tap Edit to rename or update short codes</CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {classifications.length === 0 ? (
            <li className="text-sm text-text-secondary">None yet — add below</li>
          ) : (
            classifications.map((c) => (
              <SetupEditableRow
                key={c.value}
                fields={[
                  { key: "name", label: "Name", value: String(c.meta?.name ?? c.label) },
                  {
                    key: "shortCode",
                    label: "Short code",
                    value: String(c.meta?.short_code ?? ""),
                    placeholder: "RH",
                    maxLength: 4,
                  },
                ]}
                onSave={async (values) => {
                  const result = await updateClassification(
                    orgId,
                    c.value,
                    values.name,
                    values.shortCode || undefined,
                  );
                  if (!result.error) router.refresh();
                  return result;
                }}
                onArchive={async () => {
                  const result = await archiveClassification(orgId, c.value);
                  if (!result.error) router.refresh();
                  return result;
                }}
              />
            ))
          )}
        </ul>
      </Card>

      <ClassificationForm
        orgId={orgId}
        createAction={async (...args) => {
          const result = await createClassification(...args);
          if (!result.error) router.refresh();
          return result;
        }}
      />
    </>
  );
}
