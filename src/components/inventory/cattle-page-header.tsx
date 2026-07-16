import Link from "next/link";
import type { ReactNode } from "react";
import { EnterpriseBadge } from "@/components/enterprise/enterprise-badge";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

interface CattlePageHeaderProps {
  totalHead: number;
  canManageCattle: boolean;
  showCowCalf?: boolean;
  showStocker?: boolean;
}

export function CattlePageHeader({
  totalHead,
  canManageCattle,
  showCowCalf = false,
  showStocker = true,
}: CattlePageHeaderProps) {
  const actions: ReactNode = canManageCattle ? (
    <div className="flex flex-wrap gap-2">
      <Link href="/cattle/new">
        <Button size="md">+ Receive Cattle</Button>
      </Link>
      <Link href="/cattle/move">
        <Button variant="secondary" size="md">
          Move Cattle
        </Button>
      </Link>
      <Link href="/cattle/moves">
        <Button variant="outline" size="md">
          Move History
        </Button>
      </Link>
    </div>
  ) : (
    <p className="text-sm text-text-secondary">View-only — managers record moves and count changes.</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showStocker ? <EnterpriseBadge enterprise="stocker" /> : null}
        {showCowCalf ? (
          <Link href="/cow-calf">
            <Button variant="outline" size="sm">
              Cow-Calf overview
            </Button>
          </Link>
        ) : null}
      </div>
      <AppPageHeader
        title="Lots"
        subtitle={`${totalHead.toLocaleString()} head ranch-wide`}
        actions={actions}
      />
    </div>
  );
}
