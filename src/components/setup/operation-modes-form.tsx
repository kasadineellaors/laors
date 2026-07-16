"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOperationModes, type AuthActionState } from "@/lib/actions/auth";
import { OperationModePicker } from "@/components/setup/operation-mode-picker";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OPERATION_MODES, type OperationMode } from "@/types/auth";

interface OperationModesFormProps {
  orgId: string;
  enabledModes: string[];
}

export function OperationModesForm({ orgId, enabledModes }: OperationModesFormProps) {
  const router = useRouter();
  const [selectedModes, setSelectedModes] = useState<OperationMode[]>(
    enabledModes.filter((m): m is OperationMode =>
      (OPERATION_MODES as readonly string[]).includes(m),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (selectedModes.length === 0) {
      setError("Select at least one operation module.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("orgId", orgId);
    selectedModes.forEach((m) => formData.append("modes", m));

    const result: AuthActionState = await saveOperationModes({}, formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(result.success ?? "Modules updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operation modules</CardTitle>
        <CardDescription>
          Choose which parts of LAORS your ranch uses. Enable more than one if you run stockers and
          cow-calf, seedstock and stockers, and so on.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-4 pb-4">
        <OperationModePicker value={selectedModes} onChange={setSelectedModes} disabled={loading} />

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

        <Button
          type="button"
          onClick={handleSave}
          disabled={loading || selectedModes.length === 0}
        >
          {loading ? "Saving…" : "Save modules"}
        </Button>
      </div>
    </Card>
  );
}
