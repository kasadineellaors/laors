"use client";

import { useActionState } from "react";
import { createCowCalfHerd } from "@/lib/actions/cow-calf-herds";
import type { AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: AuthActionState = {};

type Option = { id: string; name: string };

export function HerdForm({
  organizationId,
  locations,
  owners,
}: {
  organizationId: string;
  locations: Option[];
  owners: Option[];
}) {
  const [state, action, pending] = useActionState(createCowCalfHerd, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create herd</CardTitle>
        <CardDescription>
          A Cow-Calf herd is separate from a Stocker lot. Use group totals for ranch-wide counts, or
          track individual animals later.
        </CardDescription>
      </CardHeader>
      <form action={action} className="space-y-4 px-4 pb-4">
        <input type="hidden" name="organizationId" value={organizationId} />

        {state.error ? (
          <p className="text-sm text-status-critical" role="alert">
            {state.error}
          </p>
        ) : null}

        <div>
          <label htmlFor="herd-name" className="mb-1 block text-sm font-medium text-navy">
            Herd name
          </label>
          <input
            id="herd-name"
            name="name"
            required
            placeholder="Spring Calvers"
            className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-navy"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="herd-location" className="mb-1 block text-sm font-medium text-navy">
              Location
            </label>
            <select
              id="herd-location"
              name="currentLocationId"
              className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-navy"
            >
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="herd-owner" className="mb-1 block text-sm font-medium text-navy">
              Owner
            </label>
            <select
              id="herd-owner"
              name="ownerId"
              className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-navy"
            >
              <option value="">—</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="recordkeeping-mode" className="mb-1 block text-sm font-medium text-navy">
            Recordkeeping
          </label>
          <select
            id="recordkeeping-mode"
            name="recordkeepingMode"
            defaultValue="mixed"
            className="w-full rounded-lg border border-border-neutral bg-surface-white px-3 py-2 text-navy"
          >
            <option value="individual">Individual animals only</option>
            <option value="group">Group totals only</option>
            <option value="mixed">Mixed (group + individuals)</option>
          </select>
        </div>

        <fieldset className="rounded-lg border border-border-neutral p-3">
          <legend className="px-1 text-sm font-medium text-navy">Group totals (optional)</legend>
          <p className="mb-3 text-xs text-text-secondary">
            For producers who start with pasture totals before tagging every animal.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "groupCowsCount", label: "Cows" },
              { name: "groupCalvesAtSideCount", label: "Calves at side" },
              { name: "groupBullsCount", label: "Bulls" },
              { name: "groupReplacementsCount", label: "Replacements" },
            ].map((field) => (
              <div key={field.name}>
                <label htmlFor={field.name} className="mb-1 block text-xs text-text-secondary">
                  {field.label}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-full rounded-lg border border-border-neutral bg-surface-white px-2 py-2 text-navy"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <Button type="submit" fullWidth size="xl" disabled={pending}>
          {pending ? "Creating…" : "Create herd"}
        </Button>
      </form>
    </Card>
  );
}
