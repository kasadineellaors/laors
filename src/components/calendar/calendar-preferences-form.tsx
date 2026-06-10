"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrgPreferences } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarPreferencesFormProps {
  orgId: string;
  calendarEnabled: boolean;
}

export function CalendarPreferencesForm({ orgId, calendarEnabled }: CalendarPreferencesFormProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(calendarEnabled);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await updateOrgPreferences(orgId, { calendarEnabled: enabled });
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
        <CardTitle>Ranch calendar</CardTitle>
        <CardDescription>
          A shared month view for the whole crew — events you add, job due dates, and expected
          calving dates from breeding records.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-4 pb-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>
            <span className="block font-semibold text-charcoal">Show calendar on this ranch</span>
            <span className="mt-1 block text-sm text-charcoal/70">
              When off, the Calendar tab is hidden for everyone. Events are kept — turn it back on
              anytime.
            </span>
          </span>
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-olive">{success}</p> : null}

        <Button type="button" size="lg" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </Card>
  );
}
