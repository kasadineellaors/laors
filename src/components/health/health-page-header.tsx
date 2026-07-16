import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HealthPageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Health</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Treatments, medicine inventory, withdrawals, and follow-up care.
        </p>
      </div>
      <Link href="/health/treatments/new" className="sm:shrink-0">
        <Button size="md" fullWidth className="sm:w-auto">
          + Log Treatment
        </Button>
      </Link>
    </div>
  );
}
