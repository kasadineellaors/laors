"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteMyAccount } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountSettingsPanelProps {
  email: string;
  fullName: string | null;
}

export function AccountSettingsPanel({ email, fullName }: AccountSettingsPanelProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (confirmText !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await deleteMyAccount(password);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Signed in as {fullName?.trim() || email}</CardDescription>
        </CardHeader>
        <div className="space-y-1 px-4 pb-4 text-sm text-text-secondary">
          <p>
            <span className="font-medium text-navy">Email</span> — {email}
          </p>
          <p>
            Update ranch-wide settings in{" "}
            <Link href="/setup/preferences" className="text-brown hover:underline">
              Ranch Settings
            </Link>
            (managers only).
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal &amp; support</CardTitle>
          <CardDescription>App Store and account policies</CardDescription>
        </CardHeader>
        <ul className="space-y-2 px-4 pb-4 text-sm">
          <li>
            <Link href="/privacy" className="text-brown hover:underline">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms" className="text-brown hover:underline">Terms of Service</Link>
          </li>
          <li>
            <Link href="/support" className="text-brown hover:underline">Support</Link>
          </li>
        </ul>
      </Card>

      <Card className="border-status-critical/30">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently removes your login and profile. Ranch operational records created by your
            organization are retained for your team unless you are the only user.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-4 pb-4">
          {!showDelete ? (
            <Button type="button" variant="outline" onClick={() => setShowDelete(true)}>
              Delete my account
            </Button>
          ) : (
            <form onSubmit={handleDelete} className="space-y-3 rounded-lg border border-border-neutral p-4">
              <p className="text-sm text-text-secondary">
                This cannot be undone. Type <strong>DELETE</strong> and enter your password.
              </p>
              <div>
                <Label htmlFor="confirmDelete">Type DELETE</Label>
                <Input
                  id="confirmDelete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="deletePassword">Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error ? (
                <p className="text-sm text-status-critical" role="alert">{error}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? "Deleting…" : "Permanently delete account"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowDelete(false);
                    setPassword("");
                    setConfirmText("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
