"use client";

import type { ReactNode } from "react";
import { QuickActionGroup, type QuickAction } from "@/components/dashboard/quick-action-group";
import { quickAddHideLabel } from "@/components/dashboard/quick-add-label";

export type QuickAddLinkItem = {
  id: string;
  addLabel: string;
  href: string;
  variant?: QuickAction["variant"];
};

export type QuickAddPanelItem = {
  id: string;
  addLabel: string;
  hideLabel?: string;
  variant?: QuickAction["variant"];
  panel: ReactNode;
};

export type QuickAddItem =
  | ({ type: "link" } & QuickAddLinkItem)
  | ({ type: "panel" } & QuickAddPanelItem);

interface QuickAddSectionProps {
  title: string;
  items: QuickAddItem[];
  activePanelId: string | null;
  onActivePanelChange: (id: string | null) => void;
}

export function QuickAddSection({
  title,
  items,
  activePanelId,
  onActivePanelChange,
}: QuickAddSectionProps) {
  const actions: QuickAction[] = items.map((item) => {
    if (item.type === "link") {
      return {
        id: item.id,
        label: item.addLabel,
        href: item.href,
        variant: item.variant,
      };
    }

    const isActive = activePanelId === item.id;
    return {
      id: item.id,
      label: isActive
        ? quickAddHideLabel(item.addLabel, item.hideLabel)
        : item.addLabel,
      variant: isActive ? "primary" : item.variant,
      onClick: () => onActivePanelChange(isActive ? null : item.id),
    };
  });

  const activePanel = items.find(
    (item) => item.type === "panel" && item.id === activePanelId,
  );

  return (
    <div className="space-y-4">
      <QuickActionGroup title={title} actions={actions} />
      {activePanel?.type === "panel" ? activePanel.panel : null}
    </div>
  );
}
