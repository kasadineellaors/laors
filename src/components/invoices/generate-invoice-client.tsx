"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OwnerRecord } from "@/lib/owners/types";
import type { BillingPreview } from "@/lib/invoices/types";
import {
  categoryLabel,
  formatHeadDays,
  formatMoney,
  formatTons,
  previewLineDetail,
} from "@/lib/invoices/format-billing";
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
  initialOwnerId?: string;
}

function defaultPeriodStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatNum(n: number) {
  return formatHeadDays(n);
}

function rollupByPen(preview: BillingPreview) {
  const map = new Map<
    string,
    {
      locationName: string;
      billingMode: "pasture" | "yardage";
      headDays: number;
      pastureHeadDays: number;
      yardageHeadDays: number;
      lotCount: number;
    }
  >();

  for (const row of preview.headDaysBreakdown) {
    const key = row.locationId ?? "__none__";
    const existing = map.get(key);
    if (existing) {
      existing.headDays += row.headDays;
      existing.pastureHeadDays += row.pastureHeadDays;
      existing.yardageHeadDays += row.yardageHeadDays;
      existing.lotCount += 1;
    } else {
      map.set(key, {
        locationName: row.locationName ?? "No pen",
        billingMode: row.billingMode,
        headDays: row.headDays,
        pastureHeadDays: row.pastureHeadDays,
        yardageHeadDays: row.yardageHeadDays,
        lotCount: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.locationName.localeCompare(b.locationName));
}

export function GenerateInvoiceClient({
  orgId,
  ownerOptions,
  initialOwnerId,
}: GenerateInvoiceClientProps) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(
    initialOwnerId && ownerOptions.some((o) => o.id === initialOwnerId)
      ? initialOwnerId
      : (ownerOptions[0]?.id ?? ""),
  );
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
            Charges show how each line was calculated — head-days × rate, tons fed, etc.
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
                {[
                  selectedOwner.yardage_rate_per_head_day != null
                    ? `$${selectedOwner.yardage_rate_per_head_day}/hd/day yardage`
                    : null,
                  selectedOwner.pasture_rate_per_head_day != null
                    ? `$${selectedOwner.pasture_rate_per_head_day}/hd/day pasture`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No yardage or pasture rate"}
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
              {preview.totalHeadDays.toLocaleString()} total head-days over {preview.dayCount} days
              {preview.pastureHeadDays > 0 || preview.yardageHeadDays > 0
                ? ` · ${formatNum(preview.pastureHeadDays)} pasture · ${formatNum(preview.yardageHeadDays)} yardage`
                : ""}
              {preview.feedTons != null
                ? ` · ${formatTons(preview.feedTons)} tons fed (${preview.feedDeliveryCount} deliveries)`
                : preview.feedDeliveryCount > 0
                  ? ` · ${preview.feedDeliveryCount} feed deliveries`
                  : ""}
            </CardDescription>
          </CardHeader>
          {preview.warnings.length > 0 ? (
            <ul className="mb-4 space-y-1 rounded-lg bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {preview.headDaysBreakdown.length > 0 ? (
            <>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                By lot
              </p>
              <div className="mb-4 overflow-x-auto rounded-lg border border-border-neutral">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-border-neutral bg-tan/20 text-xs uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-3 py-2 font-medium">Lot</th>
                      <th className="px-3 py-2 font-medium">Pen</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Avg head</th>
                      <th className="px-3 py-2 text-right font-medium">Pasture head-days</th>
                      <th className="px-3 py-2 text-right font-medium">Yardage head-days</th>
                      <th className="px-3 py-2 text-right font-medium">Total head-days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.headDaysBreakdown.map((row) => (
                      <tr
                        key={row.groupId}
                        className="border-b border-border-neutral/60 last:border-0"
                      >
                        <td className="px-3 py-2 font-medium text-navy">
                          {row.groupName}
                          {row.ownerShare < 1
                            ? ` (${Math.round(row.ownerShare * 100)}%)`
                            : ""}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {row.locationName ?? "—"}
                        </td>
                        <td className="px-3 py-2 capitalize text-text-secondary">
                          {row.billingMode}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {formatNum(row.avgHead)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {row.pastureHeadDays > 0 ? formatNum(row.pastureHeadDays) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {row.yardageHeadDays > 0 ? formatNum(row.yardageHeadDays) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-navy">
                          {formatNum(row.headDays)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                By pen
              </p>
              <div className="mb-4 overflow-x-auto rounded-lg border border-border-neutral">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="border-b border-border-neutral bg-tan/20 text-xs uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pen</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Lots</th>
                      <th className="px-3 py-2 text-right font-medium">Head-days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollupByPen(preview).map((row) => (
                      <tr
                        key={row.locationName}
                        className="border-b border-border-neutral/60 last:border-0"
                      >
                        <td className="px-3 py-2 font-medium text-navy">{row.locationName}</td>
                        <td className="px-3 py-2 capitalize text-text-secondary">
                          {row.billingMode}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {row.lotCount}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-navy">
                          {formatNum(row.headDays)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mb-4 rounded-lg bg-tan/15 px-3 py-2 text-sm text-text-secondary">
                {preview.yardageRate != null && preview.yardageHeadDays > 0 ? (
                  <>
                    Yardage:{" "}
                    <span className="font-semibold text-navy">
                      {formatNum(preview.yardageHeadDays)} head-days × {formatMoney(preview.yardageRate)}/day
                    </span>
                    {" · "}
                  </>
                ) : null}
                {preview.pastureRate != null && preview.pastureHeadDays > 0 ? (
                  <>
                    Pasture:{" "}
                    <span className="font-semibold text-navy">
                      {formatNum(preview.pastureHeadDays)} head-days × {formatMoney(preview.pastureRate)}/day
                    </span>
                    {" · "}
                  </>
                ) : null}
                <Link href="/reports/head-days" className="font-medium text-brown hover:underline">
                  Full head-days report →
                </Link>
              </p>
            </>
          ) : null}
          {preview.lines.length > 0 ? (
            <>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Invoice charges
              </p>
              <ul className="space-y-2">
                {preview.lines.map((line, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border-neutral px-3 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy">
                          {line.category ? categoryLabel(line.category) : line.description}
                        </p>
                        <p className="mt-0.5 text-text-secondary">{line.description}</p>
                        {previewLineDetail(line) ? (
                          <p className="mt-1 text-xs font-medium text-brown">
                            {previewLineDetail(line)}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-brown">
                        {line.category === "dead"
                          ? `${line.quantity} head`
                          : formatMoney(line.quantity * line.unitPrice)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
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
