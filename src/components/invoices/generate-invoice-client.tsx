"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerOption } from "@/lib/customers/types";
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
  customerOptions: CustomerOption[];
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

export function GenerateInvoiceClient({ orgId, customerOptions }: GenerateInvoiceClientProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customerOptions[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCustomer = useMemo(
    () => customerOptions.find((c) => c.id === customerId),
    [customerOptions, customerId],
  );

  async function handlePreview() {
    if (!customerId) {
      setError("Select a customer");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await previewBillingInvoice(orgId, { customerId, periodStart, periodEnd });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPreview(null);
      return;
    }
    setPreview(result.preview ?? null);
  }

  async function handleCreate() {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    const result = await createInvoiceFromBilling(orgId, { customerId, periodStart, periodEnd });
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
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  if (customerOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add customers first</CardTitle>
          <CardDescription>
            Set up customers with yardage and medicine markup rates, then link cattle groups to them.
          </CardDescription>
        </CardHeader>
        <Link href="/setup/customers">
          <Button fullWidth>Go to Customers</Button>
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
            Yardage uses average daily head across the billing period. Medicine and feed lines
            come from treatments and feed log on customer-linked groups (with markup rates).
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="customer">Customer</Label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setPreview(null);
              }}
              className={selectClass}
            >
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {selectedCustomer ? (
              <p className="mt-1 text-xs text-charcoal/60">
                {selectedCustomer.yardage_rate_per_head_day != null
                  ? `$${selectedCustomer.yardage_rate_per_head_day}/hd/day yardage`
                  : "No yardage rate"}
                {" · "}
                {selectedCustomer.medicine_markup_percent != null
                  ? `${selectedCustomer.medicine_markup_percent}% medicine markup`
                  : "No medicine markup"}
                {" · "}
                {selectedCustomer.feed_markup_percent != null
                  ? `${selectedCustomer.feed_markup_percent}% feed markup`
                  : "No feed markup"}
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
              {preview.totalHeadDays.toLocaleString()} head-days · {preview.dayCount} days ·{" "}
              {preview.lines.length} line{preview.lines.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          {preview.headDaysBreakdown.length > 0 ? (
            <div className="mb-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-charcoal/5 text-left text-xs text-charcoal/60">
                    <th className="px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 font-medium text-right">Start</th>
                    <th className="px-3 py-2 font-medium text-right">End</th>
                    <th className="px-3 py-2 font-medium text-right">Avg hd</th>
                    <th className="px-3 py-2 font-medium text-right">Head-days</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.headDaysBreakdown.map((row) => (
                    <tr key={row.groupId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium text-charcoal">{row.groupName}</td>
                      <td className="px-3 py-2 text-right text-charcoal/70">{row.headAtStart}</td>
                      <td className="px-3 py-2 text-right text-charcoal/70">{row.headAtEnd}</td>
                      <td className="px-3 py-2 text-right text-charcoal/70">
                        {row.avgHead.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-olive">
                        {row.headDays.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {preview.warnings.length > 0 ? (
            <ul className="mb-4 space-y-1 rounded-lg bg-rust/10 px-3 py-2 text-sm text-rust">
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
                  className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-charcoal">{line.description}</p>
                    <p className="text-xs capitalize text-charcoal/50">{line.source}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-olive">
                    {formatMoney(line.quantity * line.unitPrice)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-right text-xl font-bold text-olive">
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
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
