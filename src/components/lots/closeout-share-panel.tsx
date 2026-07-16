"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCloseoutShareLink,
  sendCloseoutToCustomer,
} from "@/lib/actions/closeout-share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CloseoutSharePanelProps {
  orgId: string;
  groupId: string;
  lotLabel: string;
  customerName: string | null;
  customerEmail: string | null;
  initialShareUrl: string | null;
  lastEmailedAt: string | null;
  lastEmailedTo: string | null;
  emailConfigured: boolean;
}

export function CloseoutSharePanel({
  orgId,
  groupId,
  lotLabel,
  customerName,
  customerEmail,
  initialShareUrl,
  lastEmailedAt,
  lastEmailedTo,
  emailConfigured,
}: CloseoutSharePanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState(customerEmail ?? "");
  const [shareUrl, setShareUrl] = useState(initialShareUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreateLink() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await createCloseoutShareLink(orgId, groupId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.shareUrl) {
      setShareUrl(result.shareUrl);
      setSuccess("Share link ready");
      router.refresh();
    }
  }

  async function handleCopy() {
    const url = shareUrl || (await ensureLink());
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  async function ensureLink(): Promise<string | null> {
    if (shareUrl) return shareUrl;
    setLoading(true);
    const result = await createCloseoutShareLink(orgId, groupId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    if (result.shareUrl) {
      setShareUrl(result.shareUrl);
      router.refresh();
      return result.shareUrl;
    }
    return null;
  }

  async function handleSend() {
    const recipient = email.trim();
    if (!recipient) {
      setError("Enter a customer email");
      return;
    }
    if (!window.confirm(`Email closeout for ${lotLabel} to ${recipient}?`)) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await sendCloseoutToCustomer(orgId, groupId, recipient);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.shareUrl) setShareUrl(result.shareUrl);
    setSuccess(result.success ?? "Closeout sent");
    router.refresh();
  }

  const hasEmail = Boolean(email.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share with customer</CardTitle>
        <CardDescription>
          Send a PDF and view-only link for {customerName ?? "the billing customer"}.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={shareUrl ? handleCopy : handleCreateLink}
            disabled={loading}
          >
            {copied ? "Copied!" : shareUrl ? "Copy share link" : "Create share link"}
          </Button>
          {shareUrl ? (
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost">
                Preview link
              </Button>
            </a>
          ) : null}
        </div>

        {shareUrl ? (
          <p className="break-all rounded-lg bg-cream/60 px-3 py-2 text-xs text-charcoal/70">
            {shareUrl}
          </p>
        ) : null}

        <div>
          <Label htmlFor="closeoutEmail">Customer email</Label>
          <Input
            id="closeoutEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@example.com"
          />
        </div>

        {!emailConfigured ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-charcoal/70">
            To email closeouts, set <code className="text-xs">RESEND_API_KEY</code> and{" "}
            <code className="text-xs">INVOICE_FROM_EMAIL</code> in your environment. Share links
            still work without email.
          </p>
        ) : null}

        <Button
          type="button"
          fullWidth
          size="lg"
          onClick={handleSend}
          disabled={loading || !hasEmail || !emailConfigured}
        >
          {loading ? "Sending…" : "Email closeout PDF"}
        </Button>

        {lastEmailedAt && lastEmailedTo ? (
          <p className="text-xs text-charcoal/60">
            Last emailed to {lastEmailedTo} on{" "}
            {new Date(lastEmailedAt).toLocaleDateString()}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-olive" role="status">
            {success}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
