import Link from "next/link";
import type { ReactNode } from "react";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, linkButtonClassName } from "@/components/ui/button";

interface CattlePageHeaderProps {
  totalHead: number;
  canManageCattle: boolean;
  showCowCalf?: boolean;
}

export function CattlePageHeader({
  totalHead,
  canManageCattle,
  showCowCalf = false,
}: CattlePageHeaderProps) {
  const actions: ReactNode = canManageCattle ? (
    <div className="flex flex-wrap gap-2">
      <Link href="/cattle/new" className={linkButtonClassName({ size: "md" })}>
        + Receive Cattle
      </Link>
      <Link href="/cattle/move" className={linkButtonClassName({ variant: "secondary", size: "md" })}>
        Move Cattle
      </Link>
      <Link href="/cattle/moves" className={linkButtonClassName({ variant: "outline", size: "md" })}>
        Move History
      </Link>
    </div>
  ) : (
    <p className="text-sm text-text-secondary">View-only — managers record moves and count changes.</p>
  );

  return (
    <div className="space-y-3">
      {showCowCalf ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/cow-calf">
            <Button variant="outline" size="sm">
              Cow-Calf overview
            </Button>
          </Link>
        </div>
      ) : null}
      <AppPageHeader
        title="Lots"
        subtitle={`${totalHead.toLocaleString()} head ranch-wide`}
        actions={actions}
      />
    </div>
  );
}
