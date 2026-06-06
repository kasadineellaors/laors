"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerRecord } from "@/lib/customers/types";
import {
  archiveCustomer,
  createCustomer,
  updateCustomer,
} from "@/lib/actions/customers";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomersClientProps {
  orgId: string;
  customers: CustomerRecord[];
}

function formatRate(value: number | null) {
  if (value == null) return "";
  return String(value);
}

export function CustomersClient({ orgId, customers }: CustomersClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [yardageRate, setYardageRate] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createCustomer(orgId, {
      name,
      yardageRatePerHeadDay: yardageRate || undefined,
      medicineMarkupPercent: markupPercent || undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setName("");
      setYardageRate("");
      setMarkupPercent("");
      router.refresh();
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            Yardage and medicine markup rates feed into invoicing — tap Edit to update
          </CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {customers.length === 0 ? (
            <li className="text-sm text-charcoal/60">None yet — add below</li>
          ) : (
            customers.map((c) => (
              <SetupEditableRow
                key={c.id}
                badge={
                  c.yardage_rate_per_head_day != null
                    ? `$${c.yardage_rate_per_head_day}/hd/day`
                    : undefined
                }
                fields={[
                  { key: "name", label: "Name", value: c.name },
                  { key: "email", label: "Email", value: c.email ?? "" },
                  { key: "phone", label: "Phone", value: c.phone ?? "" },
                  { key: "address", label: "Address", value: c.address ?? "" },
                  {
                    key: "yardageRate",
                    label: "Yardage ($/head/day)",
                    value: formatRate(c.yardage_rate_per_head_day),
                    placeholder: "0.75",
                  },
                  {
                    key: "markupPercent",
                    label: "Medicine markup (%)",
                    value: formatRate(c.medicine_markup_percent),
                    placeholder: "15",
                  },
                  { key: "notes", label: "Notes", value: c.notes ?? "" },
                ]}
                onSave={async (values) => {
                  const result = await updateCustomer(orgId, c.id, {
                    name: values.name,
                    email: values.email || null,
                    phone: values.phone || null,
                    address: values.address || null,
                    yardageRatePerHeadDay: values.yardageRate ?? null,
                    medicineMarkupPercent: values.markupPercent ?? null,
                    notes: values.notes || null,
                  });
                  if (!result.error) router.refresh();
                  return result;
                }}
                onArchive={async () => {
                  const result = await archiveCustomer(orgId, c.id);
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
          <CardTitle>Add customer</CardTitle>
          <CardDescription>For custom feeding, backgrounding, or outside owners</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="yardage">Yardage ($/head/day)</Label>
              <Input
                id="yardage"
                type="number"
                min={0}
                step="0.0001"
                value={yardageRate}
                onChange={(e) => setYardageRate(e.target.value)}
                placeholder="0.75"
              />
            </div>
            <div>
              <Label htmlFor="markup">Medicine markup (%)</Label>
              <Input
                id="markup"
                type="number"
                min={0}
                step="0.01"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(e.target.value)}
                placeholder="15"
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-rust" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Adding…" : "Add customer"}
          </Button>
        </form>
      </Card>
    </>
  );
}
