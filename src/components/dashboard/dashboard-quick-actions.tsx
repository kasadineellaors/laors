"use client";

import { useState } from "react";
import type { CattleGroupSummary } from "@/lib/inventory/types";
import type { SelectOption, TreePickerOption } from "@/lib/locations/options";
import type { OrgMemberOption } from "@/lib/tasks/types";
import type { MedicineOption } from "@/lib/medicine/types";
import type { OwnerRecord } from "@/lib/owners/types";
import { QuickAddSection, type QuickAddItem } from "@/components/dashboard/quick-add-section";
import { MiscChargeQuickForm } from "@/components/reports/misc-charge-quick-form";
import { TreatmentForm } from "@/components/health/treatment-form";
import { FeedingForm } from "@/components/feed/feeding-form";
import { TaskForm } from "@/components/tasks/task-form";
import { RainfallForm } from "@/components/weather/rainfall-form";
import { MoveCattleForm } from "@/components/inventory/move-cattle-form";
import type { FeedRationOption } from "@/lib/feed/types";

interface DashboardQuickActionsProps {
  orgId: string;
  currentUserId: string;
  showCowCalf: boolean;
  showSeedstock: boolean;
  showCalendar: boolean;
  showInvoices: boolean;
  showMiscCharge: boolean;
  canRemoveCattle: boolean;
  locationTree: TreePickerOption[];
  activeGroups: CattleGroupSummary[];
  groupOptions: SelectOption[];
  memberOptions: OrgMemberOption[];
  medicineOptions: MedicineOption[];
  taskCategoryOptions: SelectOption[];
  rationOptions: FeedRationOption[];
  rationUnitCosts: Record<string, number>;
  feedingOwnerOptions: SelectOption[];
  movementReasonOptions: SelectOption[];
  ownerOptions: OwnerRecord[];
  lotOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; label: string }>;
}

export function DashboardQuickActions({
  orgId,
  currentUserId,
  showCowCalf,
  showSeedstock,
  showCalendar,
  showInvoices,
  showMiscCharge,
  canRemoveCattle,
  locationTree,
  activeGroups,
  groupOptions,
  memberOptions,
  medicineOptions,
  taskCategoryOptions,
  rationOptions,
  rationUnitCosts,
  feedingOwnerOptions,
  movementReasonOptions,
  ownerOptions,
  lotOptions,
  locationOptions,
}: DashboardQuickActionsProps) {
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const closePanel = () => setActivePanelId(null);

  const dailyItems: QuickAddItem[] = [
    { type: "link", id: "clock", addLabel: "Clock In/Out", href: "/time" },
    {
      type: "panel",
      id: "treatment",
      addLabel: "Log Treatment",
      panel: (
        <TreatmentForm
          orgId={orgId}
          currentUserId={currentUserId}
          locationTree={locationTree}
          groupOptions={groupOptions}
          memberOptions={memberOptions}
          medicineOptions={medicineOptions}
          onSuccess={closePanel}
        />
      ),
    },
    {
      type: "panel",
      id: "feeding",
      addLabel: "Log Feeding",
      panel: (
        <FeedingForm
          orgId={orgId}
          rationOptions={rationOptions}
          rationUnitCosts={rationUnitCosts}
          locationTree={locationTree}
          groupOptions={groupOptions}
          ownerOptions={feedingOwnerOptions}
          memberOptions={memberOptions}
          onSuccess={closePanel}
        />
      ),
    },
    ...(activeGroups.length > 0
      ? [
          {
            type: "panel" as const,
            id: "move",
            addLabel: "Move Cattle",
            panel: (
              <MoveCattleForm
                orgId={orgId}
                groups={activeGroups}
                locationTree={locationTree}
                movementReasonOptions={movementReasonOptions}
                initialMode="move"
                onSuccess={closePanel}
              />
            ),
          },
        ]
      : [{ type: "link" as const, id: "move", addLabel: "Move Cattle", href: "/cattle/move" }]),
    ...(canRemoveCattle && activeGroups.length > 0
      ? [
          {
            type: "panel" as const,
            id: "remove",
            addLabel: "Remove Cattle",
            panel: (
              <MoveCattleForm
                orgId={orgId}
                groups={activeGroups}
                locationTree={locationTree}
                movementReasonOptions={movementReasonOptions}
                initialMode="remove"
                onSuccess={closePanel}
              />
            ),
          },
        ]
      : canRemoveCattle
        ? [
            {
              type: "link" as const,
              id: "remove",
              addLabel: "Remove Cattle",
              href: "/cattle/move?mode=remove",
            },
          ]
        : []),
    {
      type: "panel",
      id: "task",
      addLabel: "New Task",
      panel: (
        <TaskForm
          orgId={orgId}
          currentUserId={currentUserId}
          categoryOptions={taskCategoryOptions}
          locationTree={locationTree}
          groupOptions={groupOptions}
          memberOptions={memberOptions}
          onSuccess={closePanel}
        />
      ),
    },
    {
      type: "panel",
      id: "rainfall",
      addLabel: "Rainfall",
      panel: <RainfallForm orgId={orgId} locationTree={locationTree} onSuccess={closePanel} />,
    },
    ...(showCowCalf
      ? [
          {
            type: "link" as const,
            id: "cow-calf",
            addLabel: "Cow-Calf overview",
            href: "/cow-calf",
          },
          {
            type: "link" as const,
            id: "calving",
            addLabel: "Log Calving",
            href: "/cow-calf/calving/new",
          },
        ]
      : []),
    ...(showSeedstock
      ? [{ type: "link" as const, id: "seedstock", addLabel: "Seedstock", href: "/seedstock" }]
      : []),
  ];

  const businessItems: QuickAddItem[] = [
    { type: "link", id: "sale", addLabel: "Record Sale", href: "/sales/new" },
    ...(showMiscCharge
      ? [
          {
            type: "link" as const,
            id: "owner-totals",
            addLabel: "Owner Totals",
            href: "/reports/owner-totals",
          },
        ]
      : []),
    ...(showCalendar
      ? [{ type: "link" as const, id: "calendar", addLabel: "Calendar", href: "/calendar" }]
      : []),
    ...(showInvoices
      ? [
          {
            type: "link" as const,
            id: "generate-invoice",
            addLabel: "Generate Invoice",
            href: "/invoices/generate",
          },
          { type: "link" as const, id: "new-invoice", addLabel: "New Invoice", href: "/invoices/new" },
        ]
      : []),
    ...(showMiscCharge
      ? [
          {
            type: "panel" as const,
            id: "misc-charge",
            addLabel: "Add Miscellaneous Charge",
            panel: (
              <MiscChargeQuickForm
                orgId={orgId}
                ownerOptions={ownerOptions}
                lotOptions={lotOptions}
                locationOptions={locationOptions}
                onSaved={closePanel}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="space-y-6 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-bold text-navy">Quick Actions</h2>
      <QuickAddSection
        title="Daily Operations"
        items={dailyItems}
        activePanelId={activePanelId}
        onActivePanelChange={setActivePanelId}
      />
      <QuickAddSection
        title="Business"
        items={businessItems}
        activePanelId={activePanelId}
        onActivePanelChange={setActivePanelId}
      />
    </section>
  );
}
