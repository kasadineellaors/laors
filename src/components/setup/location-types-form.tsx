"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/actions/onboarding";
import { BILLING_RATE_MODE_OPTIONS } from "@/lib/locations/billing-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationTypesFormProps {
  orgId: string;
  createAction: (
    orgId: string,
    name: string,
    tier: "property" | "location",
    billingRateMode?: "pasture" | "yardage",
  ) => Promise<ActionState>;
}

export function LocationTypesForm({ orgId, createAction }: LocationTypesFormProps) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"property" | "location">("location");
  const [billingRateMode, setBillingRateMode] = useState<"pasture" | "yardage">("yardage");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createAction(
      orgId,
      name,
      tier,
      tier === "location" ? billingRateMode : undefined,
    );
    if (result.error) setError(result.error);
    else setName("");
    setLoading(false);
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add location type</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="typeName">Name</Label>
          <Input
            id="typeName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Trap"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={tier === "property" ? "primary" : "outline"}
            size="sm"
            onClick={() => setTier("property")}
          >
            Property tier
          </Button>
          <Button
            type="button"
            variant={tier === "location" ? "primary" : "outline"}
            size="sm"
            onClick={() => setTier("location")}
          >
            Location tier
          </Button>
        </div>
        {tier === "location" ? (
          <div>
            <Label htmlFor="billingRateMode">Billing rate</Label>
            <select
              id="billingRateMode"
              value={billingRateMode}
              onChange={(e) => setBillingRateMode(e.target.value as "pasture" | "yardage")}
              className={selectClass}
            >
              {BILLING_RATE_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {error ? <p className="text-sm text-status-critical">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "Add Type"}
        </Button>
      </form>
    </Card>
  );
}
