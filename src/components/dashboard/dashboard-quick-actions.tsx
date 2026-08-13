"use client";

import { useState } from "react";
import { QuickActionGroup, type QuickAction } from "@/components/dashboard/quick-action-group";
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

  const miscAction = {
    label: showMiscForm ? "Hide misc charge" : "Miscellaneous Charge",
    onClick: () => setShowMiscForm((v) => !v),
  };

  const dailyWithMisc = showMiscCharge ? [...dailyActions, miscAction] : dailyActions;

  return (
    <section className="space-y-6 rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-bold text-navy">Quick Actions</h2>
      <QuickActionGroup title="Daily Operations" actions={dailyWithMisc} />
      <QuickActionGroup title="Business" actions={businessActions} />
      {showMiscForm ? (
        <MiscChargeQuickForm
          orgId={orgId}
          ownerOptions={ownerOptions}
          lotOptions={lotOptions}
          locationOptions={locationOptions}
        />
      ) : null}
    </section>
  );
}
