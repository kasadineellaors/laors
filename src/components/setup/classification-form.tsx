"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassificationFormProps {
  orgId: string;
  createAction: (
    orgId: string,
    name: string,
    shortCode?: string,
  ) => Promise<ActionState>;
}

export function ClassificationForm({ orgId, createAction }: ClassificationFormProps) {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createAction(orgId, name, shortCode || undefined);
    if (result.error) setError(result.error);
    else {
      setName("");
      setShortCode("");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add classification</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="className">Name</Label>
          <Input
            id="className"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Replacement Heifer"
          />
        </div>
        <div>
          <Label htmlFor="shortCode">Short code (optional)</Label>
          <Input
            id="shortCode"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
            placeholder="RH"
            maxLength={4}
          />
        </div>
        {error ? <p className="text-sm text-rust">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "Add Classification"}
        </Button>
      </form>
    </Card>
  );
}
