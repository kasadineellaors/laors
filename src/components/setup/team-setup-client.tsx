"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteTeamMember } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamSetupClientProps {
  orgId: string;
  pendingInvites: Array<{ email: string; role: string }>;
  members: Array<{ name: string; role: string; email: string | null }>;
  emailConfigured: boolean;
  emailSetupMessage: string;
}

export function TeamSetupClient({
  orgId,
  pendingInvites,
  members,
  emailConfigured,
  emailSetupMessage,
}: TeamSetupClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("worker");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("orgId", orgId);
    fd.set("email", email);
    fd.set("role", role);
    const result = await inviteTeamMember({}, fd);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEmail("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {!emailConfigured ? (
        <div className="rounded-[var(--radius-card)] border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {emailSetupMessage ||
            "Email is not configured. Add RESEND_API_KEY, INVOICE_FROM_EMAIL, and SUPABASE_SERVICE_ROLE_KEY to send invites."}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>People with access to this ranch</CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {members.length === 0 ? (
            <li className="text-sm text-text-secondary">Just you for now</li>
          ) : (
            members.map((m) => (
              <li
                key={`${m.email}-${m.name}`}
                className="flex justify-between rounded-lg border border-border-neutral px-3 py-2 text-sm"
              >
                <span className="font-medium text-navy">{m.name}</span>
                <span className="capitalize text-text-secondary">{m.role}</span>
              </li>
            ))
          )}
        </ul>
      </Card>

      {pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => (
              <li
                key={inv.email}
                className="flex justify-between rounded-lg bg-cream px-3 py-2 text-sm text-navy"
              >
                <span>{inv.email}</span>
                <span className="capitalize text-text-secondary">{inv.role}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Invite someone</CardTitle>
          <CardDescription>Workers can log time, treatments, and sales</CardDescription>
        </CardHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hand@ranch.com"
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base"
            >
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
          {error ? (
            <p className="text-sm text-status-critical" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
