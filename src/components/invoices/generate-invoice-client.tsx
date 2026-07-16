"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OwnerRecord } from "@/lib/owners/types";
import type { BillingPreview } from "@/lib/invoices/types";
import {
  createInvoiceFromBilling,
  previewBillingInvoice,
} from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GenerateInvoiceClientProps {
  orgId: string;
  ownerOptions: OwnerRecord[];
}

function defaultPeriodStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function GenerateInvoiceClient({ orgId, ownerOptions }: GenerateInvoiceClientProps) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(ownerOptions[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [extraMiscDesc, setExtraMiscDesc] = useState("");
  const [extraMiscAmount, setExtraMiscAmount] = useState("");
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedOwner = useMemo(
    () => ownerOptions.find((o) => o.id === ownerId),
    [ownerOptions, ownerId],
  );

  function extraMiscLines() {
    const amount = parseFloat(extraMiscAmount);
    if (!extraMiscDesc.trim() || Number.isNaN(amount) || amount <= 0) return undefined;
    return [{ description: extraMiscDesc.trim(), amount }];
  }

  async function handlePreview() {
    if (!ownerId) {
      setError("Select an owner");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await previewBillingInvoice(orgId, {
      ownerId,
      periodStart,
      periodEnd,
      extraMiscLines: extraMiscLines(),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPreview(null);
      return;
    }
    setPreview(result.preview ?? null);
  }

  async function handleCreate() {
    if (!ownerId) return;
    setLoading(true);
    setError(null);
    const result = await createInvoiceFromBilling(orgId, {
      ownerId,
      periodStart,
      periodEnd,
      extraMiscLines: extraMiscLines(),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.invoiceId) router.push(`/invoices/${result.invoiceId}`);
    else router.push("/invoices");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

  if (ownerOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add owners first</CardTitle>
          <CardDescription>
            Set up owners with yardage and markup rates, then assign lots to them.
          </CardDescription>
        </CardHeader>
        <Link href="/setup/owners">
          <Button fullWidth>Go to Owners</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing period</CardTitle>
          <CardDescription>
            One line per category. Markups are applied but not shown on the invoice.
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="owner">Owner</Label>
            <select
              id="owner"
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                setPreview(null);
              }}
              className={selectClass}
            >
              {ownerOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            {selectedOwner ? (
              <p className="mt-1 text-xs text-text-secondary">
                {selectedOwner.yardage_rate_per_head_day != null
                  ? `$${selectedOwner.yardage_rate_per_head_day}/hd/day yardage`
                  : "No yardage rate"}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="periodStart">Period start</Label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <Label htmlFor="periodEnd">Period end</Label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setPreview(null);
                }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border-neutral p-3">
            <p className="text-sm font-medium text-navy">Add misc at invoice time (optional)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
              <Input
                value={extraMiscDesc}
                onChange={(e) => setExtraMiscDesc(e.target.value)}
                placeholder="Description"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={extraMiscAmount}
                onChange={(e) => setExtraMiscAmount(e.target.value)}
                placeholder="Amount"
              />
            </div>
          </div>
          <Button type="button" fullWidth onClick={handlePreview} disabled={loading}>
            {loading ? "Calculating…" : "Preview lines"}
          </Button>
        </div>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {preview.totalHeadDays.toLocaleString()} head-days · {preview.dayCount} days
            </CardDescription>
          </CardHeader>
          {preview.warnings.length > 0 ? (
            <ul className="mb-4 space-y-1 rounded-lg bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {preview.lines.length > 0 ? (
            <ul className="space-y-2">
              {preview.lines.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border-neutral px-3 py-2 text-sm"
                >
                  <p className="font-medium text-navy">{line.description}</p>
                  <p className="shrink-0 font-semibold text-brown">
                    {line.category === "dead"
                      ? `${line.quantity} head`
                      : formatMoney(line.quantity * line.unitPrice)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-right text-xl font-bold text-brown">
            Total: {formatMoney(preview.subtotal)}
          </p>
          <Button
            type="button"
            fullWidth
            size="lg"
            className="mt-4"
            onClick={handleCreate}
            disabled={loading || preview.lines.length === 0}
          >
            {loading ? "Creating…" : "Create draft invoice"}
          </Button>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
