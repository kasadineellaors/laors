import Link from "next/link";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Lots</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {totalHead.toLocaleString()} head ranch-wide
          </p>
        </div>

        {canManageCattle ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
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
          <p className="text-sm text-text-secondary">
            View-only — managers record moves and count changes.
          </p>
        )}
      </div>

      {showCowCalf ? (
        <Link href="/cow-calf" className="inline-block">
          <Button variant="outline" size="sm">
            Cow-Calf — Calving &amp; Bulls
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
