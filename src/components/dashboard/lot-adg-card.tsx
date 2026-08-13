import Link from "next/link";
import type { LotAdgRow } from "@/lib/dashboard/queries";
import { formatAdgLbs } from "@/lib/inventory/adg";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LotAdgCardProps {
  operationAdgLbs: number | null;
  rows: LotAdgRow[];
}

export function LotAdgCard({ operationAdgLbs, rows }: LotAdgCardProps) {
  if (rows.length === 0 && operationAdgLbs == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Average daily gain</CardTitle>
          <CardDescription>
            Needs weight in, current lot weight, and days on feed per open lot.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average daily gain</CardTitle>
        <CardDescription>
          Operation ADG {formatAdgLbs(operationAdgLbs)} — head-weighted across {rows.length}{" "}
          lot{rows.length === 1 ? "" : "s"} with weight data
        </CardDescription>
      </CardHeader>
      <ul className="divide-y divide-border px-4 pb-4">
        {rows.slice(0, 8).map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <Link href={`/cattle/groups/${row.id}`} className="font-medium text-brown hover:underline">
              {row.label}
            </Link>
            <span className="shrink-0 text-right text-text-secondary">
              <span className="font-semibold tabular-nums text-navy">
                {formatAdgLbs(row.adg_lbs)}
              </span>
              <span className="ml-2 text-xs">
                {row.head} hd · {row.days_on_feed}d
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
