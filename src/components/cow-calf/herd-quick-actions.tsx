import { QuickActionGroup } from "@/components/dashboard/quick-action-group";

interface HerdQuickActionsProps {
  herdId: string;
}

export function HerdQuickActions({ herdId }: HerdQuickActionsProps) {
  const herdQuery = `?herd=${encodeURIComponent(herdId)}`;

  return (
    <QuickActionGroup
      title="Quick actions"
      actions={[
        { label: "Record calving", href: `/cow-calf/calving/new${herdQuery}`, variant: "primary" },
        { label: "Record breeding", href: `/cow-calf/breeding/new${herdQuery}` },
        { label: "Bull exposure", href: `/cow-calf/exposure/new${herdQuery}` },
        { label: "Wean calves", href: `/cow-calf/weaning/new${herdQuery}` },
        { label: "Process calves", href: `/cow-calf/processing/new${herdQuery}` },
        { label: "Record sale", href: `/cow-calf/sales/new${herdQuery}` },
        { label: "Record loss", href: `/cow-calf/loss/new${herdQuery}` },
        { label: "Log feed", href: `/feed/cow-calf/new${herdQuery}` },
        { label: "View reports", href: "/cow-calf/reports" },
      ]}
    />
  );
}
