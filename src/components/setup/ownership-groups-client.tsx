"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import {
  createOwnershipGroup,
  updateOwnershipGroup,
  archiveOwnershipGroup,
} from "@/lib/actions/ranch-config";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OwnershipGroupsClientProps {
  orgId: string;
  groups: SelectOption[];
}

export function OwnershipGroupsClient({ orgId, groups }: OwnershipGroupsClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createOwnershipGroup(orgId, name, ownershipType || undefined);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setName("");
      setOwnershipType("");
      router.refresh();
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ownership groups</CardTitle>
          <CardDescription>
            Stocker owners, partners, or ranch-owned cattle — tap Edit to update
          </CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {groups.length === 0 ? (
            <li className="text-sm text-charcoal/60">None yet — add below</li>
          ) : (
            groups.map((g) => (
              <SetupEditableRow
                key={g.value}
                badge={String(g.meta?.ownership_type ?? "")}
                fields={[
                  { key: "name", label: "Name", value: g.label },
                  {
                    key: "ownershipType",
                    label: "Type",
                    value: String(g.meta?.ownership_type ?? ""),
                    placeholder: "Owner, Partner, Ranch",
                  },
                  {
                    key: "contactName",
                    label: "Contact",
                    value: String(g.meta?.contact_name ?? ""),
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    value: String(g.meta?.phone ?? ""),
                  },
                ]}
                onSave={async (values) => {
                  const result = await updateOwnershipGroup(orgId, g.value, {
                    name: values.name,
                    ownershipType: values.ownershipType,
                    contactName: values.contactName,
                    phone: values.phone,
                  });
                  if (!result.error) router.refresh();
                  return result;
                }}
                onArchive={async () => {
                  const result = await archiveOwnershipGroup(orgId, g.value);
                  if (!result.error) router.refresh();
                  return result;
                }}
              />
            ))
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add ownership group</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="ownerName">Name</Label>
            <Input
              id="ownerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Smith Cattle Co"
            />
          </div>
          <div>
            <Label htmlFor="ownerType">Type (optional)</Label>
            <Input
              id="ownerType"
              value={ownershipType}
              onChange={(e) => setOwnershipType(e.target.value)}
              placeholder="Owner, Partner, Ranch-owned"
            />
          </div>
          {error ? <p className="text-sm text-rust">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add group"}
          </Button>
        </form>
      </Card>
    </>
  );
}
