import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listTasks } from "@/lib/tasks/queries";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Jobs — LAORS",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const showAll = filter === "all";

  const tasks = await listTasks(orgId, showAll ? "all" : "open");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Jobs</h1>
          <p className="text-charcoal/70">Fence, water, feeding — what needs doing</p>
        </div>
        <Link href="/jobs/new">
          <Button size="lg">+ Task</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Link href="/jobs">
          <Button variant={showAll ? "outline" : "primary"} size="sm">
            Open
          </Button>
        </Link>
        <Link href="/jobs?filter=all">
          <Button variant={showAll ? "primary" : "outline"} size="sm">
            All
          </Button>
        </Link>
      </div>

      <TaskList
        tasks={tasks}
        emptyMessage={
          showAll
            ? "No tasks recorded yet."
            : "Nothing open — tap + Task to add work."
        }
      />
    </div>
  );
}
