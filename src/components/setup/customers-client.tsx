"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerRecord } from "@/lib/customers/types";
import {
  archiveCustomer,
  createCustomer,
  updateCustomer,
} from "@/lib/actions/customers";
import { CustomerPortalPanel } from "@/components/setup/customer-portal-panel";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomersClientProps {
  orgId: string;
  customers: CustomerRecord[];
  portalUrls: Record<string, string>;
  emailConfigured: boolean;
}

function formatRate(value: number | null) {
  if (value == null) return "";
  return String(value);
}

export function CustomersClient({
  orgId,
  customers,
  portalUrls,
  emailConfigured,
}: CustomersClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [yardageRate, setYardageRate] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [feedMarkupPercent, setFeedMarkupPercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createCustomer(orgId, {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      yardageRatePerHeadDay: yardageRate || undefined,
      medicineMarkupPercent: markupPercent || undefined,
      feedMarkupPercent: feedMarkupPercent || undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setYardageRate("");
      setMarkupPercent("");
      setFeedMarkupPercent("");
      router.refresh();
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            Yardage, medicine, and feed markup rates feed into invoicing — tap Edit to update
          </CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {customers.length === 0 ? (
            <li className="text-sm text-text-secondary">None yet — add below</li>
          ) : (
            customers.map((c) => (
              <li key={c.id} className="space-y-2">
                <SetupEditableRow
                badge={
                  c.email?.trim()
                    ? c.email
                    : c.yardage_rate_per_head_day != null
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
                  {
                    key: "feedMarkupPercent",
                    label: "Feed markup (%)",
                    value: formatRate(c.feed_markup_percent),
                    placeholder: "10",
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
                    feedMarkupPercent: values.feedMarkupPercent ?? null,
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
                <CustomerPortalPanel
                  orgId={orgId}
                  customerId={c.id}
                  customerName={c.name}
                  customerEmail={c.email}
                  initialPortalUrl={portalUrls[c.id] ?? null}
                  emailConfigured={emailConfigured}
                />
              </li>
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
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@customer.com"
            />
            <p className="mt-1 text-xs text-text-secondary">Used when you send invoices to this customer</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
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
          <div>
            <Label htmlFor="feedMarkup">Feed markup (%)</Label>
            <Input
              id="feedMarkup"
              type="number"
              min={0}
              step="0.01"
              value={feedMarkupPercent}
              onChange={(e) => setFeedMarkupPercent(e.target.value)}
              placeholder="10"
            />
          </div>
          {error ? (
            <p className="text-sm text-status-critical" role="alert">
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
