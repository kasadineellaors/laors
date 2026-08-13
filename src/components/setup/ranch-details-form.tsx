"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrgRanchDetails } from "@/lib/actions/organization";
import { PhysicalAddressFields } from "@/components/setup/physical-address-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RanchDetailsFormProps {
  orgId: string;
  initialName: string;
  initialAddressLine1?: string | null;
  initialAddressLine2?: string | null;
  initialCity?: string | null;
  initialState?: string | null;
  initialZip?: string | null;
  initialPhone?: string | null;
}

export function RanchDetailsForm({
  orgId,
  initialName,
  initialAddressLine1,
  initialAddressLine2,
  initialCity,
  initialState,
  initialZip,
  initialPhone,
}: RanchDetailsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [physicalAddress, setPhysicalAddress] = useState({
    line1: initialAddressLine1 ?? "",
    line2: initialAddressLine2 ?? "",
    city: initialCity ?? "",
    state: initialState ?? "",
    zip: initialZip ?? "",
  });
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await updateOrgRanchDetails(orgId, {
      name,
      addressLine1: physicalAddress.line1,
      addressLine2: physicalAddress.line2,
      city: physicalAddress.city,
      state: physicalAddress.state,
      zip: physicalAddress.zip,
      phone,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(result.success ?? "Saved");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranch details</CardTitle>
        <CardDescription>
          Your ranch name appears in the app header, invoices, and client portal. Address and phone
          print on invoice letterhead.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSave} className="space-y-4 px-4 pb-4">
        <div>
          <Label htmlFor="ranch-name">Ranch name</Label>
          <Input
            id="ranch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border-neutral bg-tan/10 p-4">
          <p className="text-sm font-medium text-navy">Ranch address</p>
          <PhysicalAddressFields
            idPrefix="ranch"
            value={physicalAddress}
            onChange={setPhysicalAddress}
          />
          <div>
            <Label htmlFor="ranch-phone">Phone</Label>
            <Input
              id="ranch-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-0100"
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-sage" role="status">
            {success}
          </p>
        ) : null}

        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Saving…" : "Save ranch details"}
        </Button>
      </form>
    </Card>
  );
}
