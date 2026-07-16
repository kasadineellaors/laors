import Link from "next/link";
import { Button } from "@/components/ui/button";

export function JobsPageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Jobs</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Assign, track, and complete work across the ranch.
        </p>
      </div>
      <Link href="/jobs/new" className="sm:shrink-0">
        <Button size="md" fullWidth className="sm:w-auto">
          + New Task
        </Button>
      </Link>
    </div>
  );
}
