"use client";

import type { PhysicalAddress } from "@/lib/addresses/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhysicalAddressFieldsProps {
  value: PhysicalAddress;
  onChange: (value: PhysicalAddress) => void;
  idPrefix?: string;
}

export function PhysicalAddressFields({
  value,
  onChange,
  idPrefix = "address",
}: PhysicalAddressFieldsProps) {
  function update<K extends keyof PhysicalAddress>(key: K, next: string) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${idPrefix}-line1`}>Street address</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={value.line1}
          onChange={(e) => update("line1", e.target.value)}
          placeholder="123 County Road 42"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-line2`}>Address line 2 (optional)</Label>
        <Input
          id={`${idPrefix}-line2`}
          value={value.line2}
          onChange={(e) => update("line2", e.target.value)}
          placeholder="Suite, unit, etc."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor={`${idPrefix}-city`}>City</Label>
          <Input
            id={`${idPrefix}-city`}
            value={value.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            value={value.state}
            onChange={(e) => update("state", e.target.value)}
            maxLength={2}
            placeholder="TX"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-zip`}>ZIP</Label>
          <Input
            id={`${idPrefix}-zip`}
            value={value.zip}
            onChange={(e) => update("zip", e.target.value)}
            placeholder="79015"
          />
        </div>
      </div>
    </div>
  );
}
