"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SelectOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type {
  FeedRationOption,
  FeedingContext,
  FeedingFormPrefill,
  FeedingRecord,
} from "@/lib/feed/types";
import { createFeeding, updateFeeding } from "@/lib/actions/feed";
import {
  convertFeedQuantity,
  formatFeedUnitLabel,
  getFeedEntryUnitOptions,
  normalizeFeedUnit,
} from "@/lib/feed/units";
import {
  checkFeedingStock,
  estimateFeedingCost,
  type FeedCostEstimate,
  type FeedStockCheckResult,
} from "@/lib/actions/feed-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface FeedingFormProps {
  orgId: string;
  rationOptions: FeedRationOption[];
  rationUnitCosts?: Record<string, number>;
  locationOptions: SelectOption[];
  groupOptions: SelectOption[];
  ownerOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  feeding?: FeedingRecord;
  prefill?: FeedingFormPrefill;
  feedingContext?: FeedingContext;
  detailBasePath?: string;
  listPath?: string;
  onSuccess?: () => void;
}

function metaString(meta: Record<string, string | number | null> | undefined, key: string) {
  const value = meta?.[key];
  return value != null && value !== "" ? String(value) : "";
}

function metaNumber(meta: Record<string, string | number | null> | undefined, key: string) {
  const value = meta?.[key];
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function ownerFieldsFromGroupMeta(
  meta: Record<string, string | number | null> | undefined,
): { ownerId?: string; ownershipGroupId?: string } {
  const ownerId = metaString(meta, "owner_id");
  const legacyGroupId = metaString(meta, "ownership_group_id");
  if (ownerId) return { ownerId };
  if (legacyGroupId) return { ownershipGroupId: legacyGroupId, ownerId: legacyGroupId };
  return {};
}

export function FeedingForm({
  orgId,
  rationOptions,
  rationUnitCosts = {},
  locationOptions,
  groupOptions,
  ownerOptions,
  memberOptions,
  feeding,
  prefill,
  feedingContext = "general",
  detailBasePath = "/feed/log",
  listPath = "/feed/log",
  onSuccess,
}: FeedingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(feeding);
  const requireLocation = locationOptions.length > 0;
  const requireOwner = ownerOptions.length > 0;
  const hasGroups = groupOptions.length > 0;

  const initialGroupId = feeding?.cattle_group_id ?? prefill?.groupId ?? "";
  const initialLocationId = feeding?.location_id ?? prefill?.locationId ?? "";
  const initialOwnerId =
    feeding?.owner_id ?? feeding?.ownership_group_id ?? prefill?.ownerId ?? "";

  const [groupId, setGroupId] = useState(initialGroupId);
  const [locationId, setLocationId] = useState(initialLocationId);
  const [ownerId, setOwnerId] = useState(initialOwnerId);
  const [feedRationId, setFeedRationId] = useState(
    feeding?.feed_ration_id ?? prefill?.feedRationId ?? rationOptions[0]?.id ?? "",
  );
  const [fedAt, setFedAt] = useState(feeding?.fed_at ?? new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState(
    feeding != null ? String(feeding.quantity) : prefill?.quantity ?? "",
  );
  const [entryUnit, setEntryUnit] = useState(
    feeding?.feed_ration_unit ?? rationOptions[0]?.unit ?? "ton",
  );
  const [showMore, setShowMore] = useState(false);
  const [headCount, setHeadCount] = useState(
    feeding?.head_count != null ? String(feeding.head_count) : "",
  );
  const [fedBy, setFedBy] = useState(feeding?.fed_by ?? "");
  const [notes, setNotes] = useState(feeding?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [costEstimate, setCostEstimate] = useState<FeedCostEstimate | null>(null);
  const [stockCheck, setStockCheck] = useState<FeedStockCheckResult | null>(null);

  const selectedGroup = groupOptions.find((g) => g.value === groupId);
  const groupMeta = selectedGroup?.meta;
  const groupLocationId = metaString(groupMeta, "location_id");
  const groupOwnerId =
    metaString(groupMeta, "owner_id") || metaString(groupMeta, "ownership_group_id");
  const groupOwnerName =
    metaString(groupMeta, "owner_name") ||
    metaString(groupMeta, "customer_name") ||
    metaString(groupMeta, "ownership_group_name");
  const groupLotName = metaString(groupMeta, "name") || selectedGroup?.label;
  const groupLocationLabel =
    metaString(groupMeta, "location_breadcrumb") || metaString(groupMeta, "location_name");
  const groupHeadCount = metaNumber(groupMeta, "total_head");

  const ownerFromGroup = Boolean(groupId && groupOwnerId);
  const locationFromGroup = Boolean(groupId && groupLocationId);
  const showLocationField = requireLocation && (!groupId || !locationFromGroup);
  const showOwnerField = requireOwner && !ownerFromGroup;

  const selectedRation = rationOptions.find((r) => r.id === feedRationId);
  const rationUnit = selectedRation?.unit?.trim() || "unit";
  const entryUnitOptions = getFeedEntryUnitOptions(rationUnit);

  const quantityInRationUnit = useMemo(() => {
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) return null;
    if (normalizeFeedUnit(entryUnit) === normalizeFeedUnit(rationUnit)) return qty;
    return convertFeedQuantity(qty, entryUnit, rationUnit);
  }, [quantity, entryUnit, rationUnit]);

  const effectiveHeadCount = useMemo(() => {
    const override = headCount.trim() ? parseInt(headCount, 10) : null;
    if (override != null && !Number.isNaN(override) && override > 0) return override;
    if (groupHeadCount != null && groupHeadCount > 0) return groupHeadCount;
    if (feeding?.head_count != null && feeding.head_count > 0) return feeding.head_count;
    return null;
  }, [headCount, groupHeadCount, feeding?.head_count]);

  async function refreshPreview(
    nextRationId = feedRationId,
    nextQuantity = quantity,
    nextFedAt = fedAt,
    nextHeadCount = effectiveHeadCount,
    nextEntryUnit = entryUnit,
    nextRationUnit = rationUnit,
  ) {
    const qty = parseFloat(nextQuantity);
    if (!nextRationId || Number.isNaN(qty) || qty <= 0) {
      setCostEstimate(null);
      setStockCheck(null);
      return;
    }

    const rationQty =
      normalizeFeedUnit(nextEntryUnit) === normalizeFeedUnit(nextRationUnit)
        ? qty
        : convertFeedQuantity(qty, nextEntryUnit, nextRationUnit);
    if (rationQty == null || rationQty <= 0) {
      setCostEstimate(null);
      setStockCheck(null);
      return;
    }

    const [cost, stock] = await Promise.all([
      estimateFeedingCost(orgId, nextRationId, rationQty, nextFedAt, nextHeadCount),
      checkFeedingStock(orgId, nextRationId, rationQty),
    ]);
    setCostEstimate(cost);
    setStockCheck(stock);
  }

  function handleGroupChange(nextGroupId: string) {
    setGroupId(nextGroupId);
    const group = groupOptions.find((g) => g.value === nextGroupId);
    if (!group) return;
    const loc = metaString(group.meta, "location_id");
    const ownerFields = ownerFieldsFromGroupMeta(group.meta);
    if (loc) setLocationId(loc);
    if (ownerFields.ownerId) setOwnerId(ownerFields.ownerId);
    void refreshPreview();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    const resolvedLocationId = locationFromGroup ? groupLocationId : locationId;
    const resolvedOwnerId = ownerFromGroup ? groupOwnerId : ownerId;
    const ownerFields = ownerFromGroup
      ? ownerFieldsFromGroupMeta(groupMeta)
      : resolvedOwnerId
        ? { ownerId: resolvedOwnerId }
        : {};

    if (!groupId && requireLocation && !resolvedLocationId) {
      errors.location = "Select a cattle lot or location";
    }
    if (groupId && requireLocation && !resolvedLocationId) {
      errors.location = "This lot has no location assigned — select one below";
    }
    if (showOwnerField && !resolvedOwnerId) {
      errors.owner = "Select an owner";
    }
    if (!feedRationId) {
      errors.ration = "Select a ration";
    }

    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      errors.quantity = "Enter an amount greater than zero";
    }

    const rationQty =
      !Number.isNaN(qty) && qty > 0
        ? normalizeFeedUnit(entryUnit) === normalizeFeedUnit(rationUnit)
          ? qty
          : convertFeedQuantity(qty, entryUnit, rationUnit)
        : null;

    if (!Number.isNaN(qty) && qty > 0 && rationQty == null) {
      errors.quantity = `Cannot convert ${formatFeedUnitLabel(entryUnit)} to ${formatFeedUnitLabel(rationUnit)}`;
    }
    if (rationQty != null && rationQty <= 0) {
      errors.quantity = "Enter an amount greater than zero";
    }

    const parsedHead = headCount.trim() ? parseInt(headCount, 10) : undefined;
    if (headCount.trim() && (Number.isNaN(parsedHead!) || parsedHead! <= 0)) {
      errors.headCount = "Head count must be a positive number";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const payload = {
      feedRationId,
      quantity: rationQty!,
      fedAt,
      cattleGroupId: groupId || undefined,
      locationId: resolvedLocationId || undefined,
      ownershipGroupId: ownerFields.ownershipGroupId,
      ownerId: ownerFields.ownerId,
      headCount: parsedHead,
      fedBy: fedBy || undefined,
      notes: notes || undefined,
      feedingContext,
      requireLocation,
      requireOwner,
    };

    const result = isEdit
      ? await updateFeeding(orgId, feeding!.id, {
          feedRationId,
          quantity: rationQty!,
          fedAt,
          cattleGroupId: groupId || null,
          locationId: resolvedLocationId || null,
          ownershipGroupId: ownerFields.ownershipGroupId ?? null,
          ownerId: ownerFields.ownerId ?? null,
          headCount: parsedHead ?? null,
          fedBy: fedBy || null,
          notes: notes || null,
        })
      : await createFeeding(orgId, payload);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }

    if (result.feedingId && isEdit) {
      router.push(`${detailBasePath}/${result.feedingId}`);
      router.refresh();
      return;
    }

    if (result.feedingId) {
      setSuccessId(result.feedingId);
      router.refresh();
      return;
    }

    router.push(listPath);
    router.refresh();
  }

  const selectClass =
    "flex h-12 min-h-11 w-full rounded-lg border border-border-neutral bg-surface-white px-4 text-base text-text-primary";

  if (rationOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active rations found</CardTitle>
          <CardDescription>
            Add feedstuff to inventory, then build a ration from what you have on hand.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-4 pb-4">
          <Button fullWidth onClick={() => router.push("/feed/inventory/new")}>
            Add feedstuff
          </Button>
          <Button variant="secondary" fullWidth onClick={() => router.push("/feed/rations/new")}>
            Create ration
          </Button>
        </div>
      </Card>
    );
  }

  if (successId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feeding logged</CardTitle>
          <CardDescription>The record was saved and inventory was updated.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <Link href={`${detailBasePath}/${successId}`}>
            <Button fullWidth size="lg">
              View feeding
            </Button>
          </Link>
          <Link href={listPath}>
            <Button variant="outline" fullWidth size="lg">
              Back to feed log
            </Button>
          </Link>
          <Button
            variant="ghost"
            fullWidth
            size="lg"
            onClick={() => {
              setSuccessId(null);
              setQuantity("");
              setNotes("");
              setHeadCount("");
              setEntryUnit(rationUnit);
            }}
          >
            Log another feeding
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit feeding" : "Log feeding"}</CardTitle>
        <CardDescription>
          Choose the cattle, select the feed, enter the amount, and confirm the cost.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {hasGroups ? (
          <div>
            <Label htmlFor="group">Cattle lot or location</Label>
            <select
              id="group"
              value={groupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className={cn(selectClass, fieldErrors.group && "border-status-critical")}
              aria-invalid={Boolean(fieldErrors.group)}
              aria-describedby={fieldErrors.group ? "group-error" : undefined}
            >
              <option value="">Select a cattle lot or location</option>
              {groupOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {fieldErrors.group ? (
              <p id="group-error" className="mt-1 text-sm text-status-critical" role="alert">
                {fieldErrors.group}
              </p>
            ) : null}
          </div>
        ) : null}

        {groupId && (groupLotName || groupLocationLabel || groupHeadCount != null) ? (
          <div className="rounded-lg border border-border-neutral bg-tan/20 px-4 py-3 text-sm">
            {groupLotName ? <p className="font-semibold text-navy">{groupLotName}</p> : null}
            {groupLocationLabel || groupHeadCount != null ? (
              <p className="mt-1 text-text-secondary">
                {[groupLocationLabel, groupHeadCount != null ? `${groupHeadCount} head` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {groupOwnerName ? (
              <p className="mt-1 text-text-secondary">
                Owner: <span className="text-text-primary">{groupOwnerName}</span>
              </p>
            ) : null}
            {effectiveHeadCount != null ? (
              <p className="mt-1 text-xs text-text-secondary">Current head count</p>
            ) : null}
          </div>
        ) : null}

        {showLocationField ? (
          <div>
            <Label htmlFor="location">
              {hasGroups ? "Location" : "Cattle lot or location"}
            </Label>
            <select
              id="location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={cn(selectClass, fieldErrors.location && "border-status-critical")}
              required={requireLocation}
              aria-invalid={Boolean(fieldErrors.location)}
              aria-describedby={fieldErrors.location ? "location-error" : undefined}
            >
              <option value="">Select a cattle lot or location</option>
              {locationOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {fieldErrors.location ? (
              <p id="location-error" className="mt-1 text-sm text-status-critical" role="alert">
                {fieldErrors.location}
              </p>
            ) : null}
          </div>
        ) : null}

        {ownerFromGroup && groupOwnerName ? (
          <div className="text-sm text-text-secondary">
            Owner: <span className="font-medium text-text-primary">{groupOwnerName}</span>
          </div>
        ) : null}

        {showOwnerField ? (
          <div>
            <Label htmlFor="owner">Owner</Label>
            <select
              id="owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={cn(selectClass, fieldErrors.owner && "border-status-critical")}
              required={requireOwner}
              aria-invalid={Boolean(fieldErrors.owner)}
              aria-describedby={fieldErrors.owner ? "owner-error" : undefined}
            >
              <option value="">Select owner</option>
              {ownerOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {fieldErrors.owner ? (
              <p id="owner-error" className="mt-1 text-sm text-status-critical" role="alert">
                {fieldErrors.owner}
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <Label htmlFor="ration">Ration</Label>
          <select
            id="ration"
            value={feedRationId}
            onChange={(e) => {
              const nextRationId = e.target.value;
              const nextRation = rationOptions.find((r) => r.id === nextRationId);
              const nextRationUnit = nextRation?.unit?.trim() || "unit";
              const nextEntryOptions = getFeedEntryUnitOptions(nextRationUnit);
              setFeedRationId(nextRationId);
              setEntryUnit((current) =>
                nextEntryOptions.includes(current) ? current : nextRationUnit,
              );
              void refreshPreview(
                nextRationId,
                quantity,
                fedAt,
                effectiveHeadCount,
                nextEntryOptions.includes(entryUnit) ? entryUnit : nextRationUnit,
                nextRationUnit,
              );
            }}
            className={cn(selectClass, fieldErrors.ration && "border-status-critical")}
            required
            aria-invalid={Boolean(fieldErrors.ration)}
            aria-describedby={fieldErrors.ration ? "ration-error" : undefined}
          >
            {rationOptions.map((r) => {
              const cost = rationUnitCosts[r.id];
              const costLabel =
                cost != null && cost > 0
                  ? ` — ${formatCurrency(cost)}/${r.unit}`
                  : "";
              return (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {costLabel}
                </option>
              );
            })}
          </select>
          {fieldErrors.ration ? (
            <p id="ration-error" className="mt-1 text-sm text-status-critical" role="alert">
              {fieldErrors.ration}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="quantity">Amount fed</Label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="quantity"
              type="number"
              min={0.01}
              step="any"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                void refreshPreview(
                  feedRationId,
                  e.target.value,
                  fedAt,
                  effectiveHeadCount,
                  entryUnit,
                  rationUnit,
                );
              }}
              required
              placeholder="0"
              aria-invalid={Boolean(fieldErrors.quantity)}
              aria-describedby={fieldErrors.quantity ? "quantity-error" : "cost-preview"}
            />
            <select
              id="entryUnit"
              value={entryUnit}
              onChange={(e) => {
                setEntryUnit(e.target.value);
                void refreshPreview(
                  feedRationId,
                  quantity,
                  fedAt,
                  effectiveHeadCount,
                  e.target.value,
                  rationUnit,
                );
              }}
              className={cn(selectClass, "min-w-[5.5rem] px-3")}
              aria-label="Feed amount unit"
            >
              {entryUnitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {formatFeedUnitLabel(unit)}
                </option>
              ))}
            </select>
          </div>
          {quantityInRationUnit != null &&
          normalizeFeedUnit(entryUnit) !== normalizeFeedUnit(rationUnit) ? (
            <p className="mt-1 text-xs text-text-secondary">
              = {quantityInRationUnit.toLocaleString()} {formatFeedUnitLabel(rationUnit)} stored
              on ration
            </p>
          ) : null}
          {fieldErrors.quantity ? (
            <p id="quantity-error" className="mt-1 text-sm text-status-critical" role="alert">
              {fieldErrors.quantity}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={fedAt}
            onChange={(e) => {
              setFedAt(e.target.value);
              void refreshPreview(feedRationId, quantity, e.target.value, effectiveHeadCount);
            }}
            required
          />
        </div>

        {stockCheck && !stockCheck.ok && stockCheck.hasRecipe ? (
          <div
            className="rounded-lg border border-status-warning/40 bg-status-warning-bg px-4 py-3 text-sm text-text-primary"
            role="status"
          >
            <p className="font-medium text-status-warning">Low inventory warning</p>
            <ul className="mt-2 space-y-1">
              {stockCheck.shortages.map((s) => (
                <li key={s.itemId}>
                  {s.itemName}: need {s.needed.toLocaleString()} {s.unit}, have{" "}
                  {s.onHand.toLocaleString()} {s.unit}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-text-secondary">
              You can still save — inventory will be deducted when you submit.
            </p>
          </div>
        ) : null}

        {costEstimate != null && costEstimate.totalCost > 0 ? (
          <div
            id="cost-preview"
            className="rounded-lg border border-border-neutral bg-surface-white px-4 py-3 text-sm"
          >
            <p className="font-medium text-text-primary">
              Estimated feed cost: {formatCurrency(costEstimate.totalCost)}
            </p>
            {costEstimate.amountPerHead != null ? (
              <p className="mt-1 text-text-secondary">
                Amount per head: {costEstimate.amountPerHead.toFixed(2)}{" "}
                {formatFeedUnitLabel(rationUnit)}
                {normalizeFeedUnit(entryUnit) !== normalizeFeedUnit(rationUnit) &&
                quantityInRationUnit != null &&
                effectiveHeadCount
                  ? ` (${(parseFloat(quantity) / effectiveHeadCount).toFixed(2)} ${formatFeedUnitLabel(entryUnit)})`
                  : null}
              </p>
            ) : null}
            {costEstimate.costPerHead != null ? (
              <p className="mt-1 text-text-secondary">
                Estimated cost per head: {formatCurrency(costEstimate.costPerHead)}
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <button
            type="button"
            className="flex min-h-11 items-center text-sm font-medium text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            aria-controls="feeding-more-details"
          >
            {showMore ? "− Hide details" : "+ Add details"}
          </button>
        </div>

        {showMore ? (
          <div
            id="feeding-more-details"
            className="space-y-4 rounded-lg border border-border-neutral bg-tan/20 p-4"
          >
            <div>
              <Label htmlFor="headCount">Head fed (override)</Label>
              <Input
                id="headCount"
                type="number"
                min={1}
                value={headCount}
                onChange={(e) => {
                  setHeadCount(e.target.value);
                  const override = e.target.value.trim()
                    ? parseInt(e.target.value, 10)
                    : null;
                  const heads =
                    override != null && !Number.isNaN(override) && override > 0
                      ? override
                      : effectiveHeadCount;
                  void refreshPreview(feedRationId, quantity, fedAt, heads);
                }}
                placeholder="Uses current head count when blank"
                aria-invalid={Boolean(fieldErrors.headCount)}
                aria-describedby={fieldErrors.headCount ? "headCount-error" : undefined}
              />
              {fieldErrors.headCount ? (
                <p id="headCount-error" className="mt-1 text-sm text-status-critical" role="alert">
                  {fieldErrors.headCount}
                </p>
              ) : null}
            </div>
            {memberOptions.length > 0 ? (
              <div>
                <Label htmlFor="fedBy">Fed by</Label>
                <select
                  id="fedBy"
                  value={fedBy}
                  onChange={(e) => setFedBy(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Me</option>
                  {memberOptions.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" fullWidth size="xl" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Log Feeding"}
        </Button>
      </form>
    </Card>
  );
}
