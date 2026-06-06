"use client";

import { useState } from "react";
import {
  createRanchOrganization,
  saveOperationModes,
  completeOnboarding,
  type AuthActionState,
} from "@/lib/actions/auth";
import {
  saveLocationTypes,
  createProperty,
  createLocationUnderParent,
  inviteTeamMember,
  seedRanchDefaults,
} from "@/lib/actions/onboarding";
import { getSuggestedLocationTypes } from "@/lib/config/defaults";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  OPERATION_MODES,
  OPERATION_MODE_LABELS,
  type OperationMode,
} from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const US_STATES = [
  "AL", "AZ", "AR", "CA", "CO", "FL", "GA", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "MO", "MS", "MT", "NE", "NV", "NM", "ND", "OK", "OR", "SC",
  "SD", "TN", "TX", "UT", "VA", "WY",
];

interface OnboardingWizardProps {
  existingOrgId?: string | null;
  existingOrgName?: string | null;
  existingModes?: string[];
}

export function OnboardingWizard({
  existingOrgId,
  existingOrgName,
  existingModes = [],
}: OnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(existingOrgId ? 1 : 0);
  const [orgId, setOrgId] = useState<string | null>(existingOrgId ?? null);
  const [ranchName, setRanchName] = useState(existingOrgName ?? "");
  const [selectedModes, setSelectedModes] = useState<OperationMode[]>(
    existingModes.filter((m): m is OperationMode =>
      (OPERATION_MODES as readonly string[]).includes(m),
    ),
  );
  const [locationTypes, setLocationTypes] = useState(
    getSuggestedLocationTypes(selectedModes.length ? selectedModes : ["cow_calf"]),
  );
  const [propertyName, setPropertyName] = useState("Home Place");
  const [locationName, setLocationName] = useState("");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStep = ONBOARDING_STEPS[stepIndex];

  async function handleRanchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result: AuthActionState = await createRanchOrganization({}, formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (result.success && result.success.length > 10) {
      setOrgId(result.success);
    }
    setStepIndex(1);
    setLoading(false);
  }

  async function handleModesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("orgId", orgId);
    selectedModes.forEach((m) => formData.append("modes", m));
    const result = await saveOperationModes({}, formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setLocationTypes(getSuggestedLocationTypes(selectedModes));
    await seedRanchDefaults(orgId, selectedModes);
    setStepIndex(2);
    setLoading(false);
  }

  function toggleMode(mode: OperationMode) {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  }

  function updateLocationTypeName(index: number, name: string) {
    setLocationTypes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name, pluralName: name + "s" };
      return next;
    });
  }

  async function handleLocationTypesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("types", JSON.stringify(locationTypes));
    const result = await saveLocationTypes({}, formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setStepIndex(3);
    setLoading(false);
  }

  async function handlePropertySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const result = await createProperty(orgId, propertyName);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (result.locationId) setPropertyId(result.locationId);
    setStepIndex(4);
    setLoading(false);
  }

  async function handleFirstLocationSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId || !propertyId) return;
    setLoading(true);
    setError(null);
    if (locationName.trim()) {
      const result = await createLocationUnderParent(orgId, propertyId, locationName);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }
    setStepIndex(5);
    setLoading(false);
  }

  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    if (inviteEmail.trim()) {
      const formData = new FormData();
      formData.set("orgId", orgId);
      formData.set("email", inviteEmail);
      formData.set("role", "worker");
      const result = await inviteTeamMember({}, formData);
      if (result.error) setError(result.error);
      else setInviteMessage(result.success ?? "Invite recorded");
    }
    setLoading(false);
  }

  async function handleFinish() {
    if (!orgId) return;
    setLoading(true);
    await completeOnboarding(orgId);
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8">
        <p className="text-sm font-semibold text-saddle">
          Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">
          {ONBOARDING_STEP_LABELS[currentStep]}
        </h1>
        <div className="mt-4 flex gap-1">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i <= stepIndex ? "bg-olive" : "bg-tan-light",
              )}
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-rust/10 px-4 py-3 text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}

      {currentStep === "ranch" && (
        <Card>
          <CardHeader>
            <CardTitle>Name your ranch</CardTitle>
            <CardDescription>
              This is how LAORS will refer to your operation.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRanchSubmit} className="space-y-4">
            <div>
              <Label htmlFor="ranchName">Ranch name</Label>
              <Input
                id="ranchName"
                name="ranchName"
                required
                value={ranchName}
                onChange={(e) => setRanchName(e.target.value)}
                placeholder="Double K Cattle Co"
              />
            </div>
            <div>
              <Label htmlFor="state">State (optional)</Label>
              <select
                id="state"
                name="state"
                className="flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="timezone" value="America/Chicago" />
            <Button type="submit" fullWidth size="xl" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </Card>
      )}

      {currentStep === "modes" && (
        <Card>
          <CardHeader>
            <CardTitle>How do you run cattle?</CardTitle>
            <CardDescription>Select all that apply.</CardDescription>
          </CardHeader>
          <form onSubmit={handleModesSubmit} className="space-y-4">
            <div className="space-y-3">
              {OPERATION_MODES.filter((m) => m !== "seedstock").map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleMode(mode)}
                  className={cn(
                    "flex w-full touch-target items-center justify-between rounded-xl border-2 px-5 py-4 text-left",
                    selectedModes.includes(mode)
                      ? "border-olive bg-olive/10"
                      : "border-border bg-surface",
                  )}
                >
                  <span className="text-lg font-semibold">
                    {OPERATION_MODE_LABELS[mode]}
                  </span>
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2",
                    selectedModes.includes(mode) ? "border-olive bg-olive text-white" : "border-border",
                  )}>
                    {selectedModes.includes(mode) ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
            <Button type="submit" fullWidth size="xl" disabled={loading || selectedModes.length === 0}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </Card>
      )}

      {currentStep === "location_types" && (
        <Card>
          <CardHeader>
            <CardTitle>What do you call your land?</CardTitle>
            <CardDescription>
              Edit names to match your ranch. LAORS never forces &quot;pasture&quot; or &quot;pen&quot; on you.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLocationTypesSubmit} className="space-y-4">
            {locationTypes.map((t, i) => (
              <div key={i}>
                <Label>{t.tier === "property" ? "Property tier label" : "Location tier label"}</Label>
                <Input
                  value={t.name}
                  onChange={(e) => updateLocationTypeName(i, e.target.value)}
                  required
                />
              </div>
            ))}
            <Button type="submit" fullWidth size="xl" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </Card>
      )}

      {currentStep === "first_property" && (
        <Card>
          <CardHeader>
            <CardTitle>Add your first property</CardTitle>
            <CardDescription>Home place, main unit, or lease — your call.</CardDescription>
          </CardHeader>
          <form onSubmit={handlePropertySubmit} className="space-y-4">
            <div>
              <Label htmlFor="propertyName">Property name</Label>
              <Input
                id="propertyName"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" fullWidth size="xl" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </Card>
      )}

      {currentStep === "first_locations" && (
        <Card>
          <CardHeader>
            <CardTitle>Add a location</CardTitle>
            <CardDescription>
              Under {propertyName}. Add one now or skip — you can add more in Ranch Setup.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleFirstLocationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="locationName">Location name (optional)</Label>
              <Input
                id="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="South Trap"
              />
            </div>
            <Button type="submit" fullWidth size="xl" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={() => setStepIndex(5)}>
              Skip for now
            </Button>
          </form>
        </Card>
      )}

      {currentStep === "team" && (
        <Card>
          <CardHeader>
            <CardTitle>Invite your crew</CardTitle>
            <CardDescription>Optional — add a foreman or ranch hand.</CardDescription>
          </CardHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Email (optional)</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="foreman@ranch.com"
              />
            </div>
            {inviteMessage ? (
              <p className="text-sm text-sage">{inviteMessage}</p>
            ) : null}
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {inviteEmail.trim() ? "Save Invite" : "Skip"}
            </Button>
            <Button
              type="button"
              fullWidth
              size="xl"
              disabled={loading || !orgId}
              onClick={handleFinish}
            >
              {loading ? "Finishing…" : "Go to Dashboard"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
