"use client";

import { useState } from "react";
import { QuickActionGroup, type QuickAction } from "@/components/dashboard/quick-action-group";
import { quickAddHideLabel } from "@/components/dashboard/quick-add-label";
import { MiscChargeQuickForm } from "@/components/reports/misc-charge-quick-form";
import type { OwnerRecord } from "@/lib/owners/types";

interface DashboardQuickActionsProps {
  orgId: string;
  dailyActions: QuickAction[];
  businessActions: QuickAction[];
  showMiscCharge: boolean;
  ownerOptions: OwnerRecord[];
  lotOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; label: string }>;
}

export function DashboardQuickActions({
  orgId,
  dailyActions,
  businessActions,
  showMiscCharge,
  ownerOptions,
  lotOptions,
  locationOptions,
}: DashboardQuickActionsProps) {
  const [showMiscForm, setShowMiscForm] = useState(false);

  const miscAddLabel = "Add Miscellaneous Charge";
  const businessWithMisc = showMiscCharge
    ? [
        ...businessActions,
        {
          id: "misc-charge",
          label: showMiscForm ? quickAddHideLabel(miscAddLabel) : miscAddLabel,
          variant: showMiscForm ? ("primary" as const) : undefined,
          onClick: () => setShowMiscForm((v) => !v),
        },
      ]
    : businessActions;

  return (
    <section className="space-y-6 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-bold text-navy">Quick Actions</h2>
      <QuickActionGroup title="Daily Operations" actions={dailyActions} />
      <QuickActionGroup title="Business" actions={businessWithMisc} />
      {showMiscForm ? (
        <MiscChargeQuickForm
          orgId={orgId}
          ownerOptions={ownerOptions}
          lotOptions={lotOptions}
          locationOptions={locationOptions}
          onSaved={() => setShowMiscForm(false)}
        />
      ) : null}
    </section>
  );
}
