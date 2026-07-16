"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCustomerPortalLink,
  sendCustomerPortalInvite,
} from "@/lib/actions/customer-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerPortalPanelProps {
  orgId: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  initialPortalUrl: string | null;
  emailConfigured: boolean;
}

export function CustomerPortalPanel({
  orgId,
  customerId,
  customerName,
  customerEmail,
  initialPortalUrl,
  emailConfigured,
}: CustomerPortalPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState(customerEmail ?? "");
  const [portalUrl, setPortalUrl] = useState(initialPortalUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function ensureLink(): Promise<string | null> {
    if (portalUrl) return portalUrl;
    setLoading(true);
    setError(null);
    const result = await createCustomerPortalLink(orgId, customerId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return null;
    }
    if (result.portalUrl) {
      setPortalUrl(result.portalUrl);
      router.refresh();
      return result.portalUrl;
    }
    return null;
  }

  async function handleCopy() {
    const url = await ensureLink();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  async function handleEmail() {
    const recipient = email.trim();
    if (!recipient) {
      setError("Enter a customer email");
      return;
    }
    if (!window.confirm(`Email portal link to ${recipient}?`)) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await sendCustomerPortalInvite(orgId, customerId, recipient);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.portalUrl) setPortalUrl(result.portalUrl);
    setSuccess(result.success ?? "Portal invite sent");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-cream/40 px-3 py-3 text-sm">
      <p className="font-semibold text-charcoal">Customer portal</p>
      <p className="text-xs text-charcoal/60">
        {customerName} can view lots, closeouts, and invoices without logging in.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={loading}>
          {copied ? "Copied!" : portalUrl ? "Copy portal link" : "Create portal link"}
        </Button>
        {portalUrl ? (
          <a href={portalUrl} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="ghost" size="sm">
              Preview
            </Button>
          </a>
        ) : null}
      </div>
      {portalUrl ? (
        <p className="mt-2 break-all text-xs text-charcoal/60">{portalUrl}</p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor={`portal-email-${customerId}`} className="text-xs">
            Email invite
          </Label>
          <Input
            id={`portal-email-${customerId}`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="billing@customer.com"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleEmail}
          disabled={loading || !emailConfigured || !email.trim()}
        >
          {loading ? "Sending…" : "Send invite"}
        </Button>
      </div>
      {!emailConfigured ? (
        <p className="mt-2 text-xs text-charcoal/50">
          Configure Resend to email portal invites. Copy link works without email.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-rust" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-2 text-xs text-olive" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
