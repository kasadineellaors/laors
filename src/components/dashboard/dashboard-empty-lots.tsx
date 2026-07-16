import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardEmptyLots() {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-neutral bg-surface-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-bold text-navy">Operations</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Receive your first lot to see ranch-wide KPIs here.
      </p>
      <Link href="/cattle/new" className="mt-4 block">
        <Button fullWidth size="lg">
          Receive lot
        </Button>
      </Link>
    </section>
  );
}
