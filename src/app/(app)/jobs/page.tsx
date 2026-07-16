import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listTasks } from "@/lib/tasks/queries";
import { computeJobsSummary } from "@/lib/tasks/summary";
import { JobsPageHeader } from "@/components/tasks/jobs-page-header";
import { JobsSummaryMetrics } from "@/components/tasks/jobs-summary-metrics";
import { TaskList } from "@/components/tasks/task-list";

export const metadata: Metadata = {
  title: "Jobs — LAORS",
};

export default async function JobsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;

  const tasks = await listTasks(orgId, "all");
  const summary = computeJobsSummary(tasks);
  const showMetrics = tasks.length > 0;

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col gap-6 pb-4">
      <JobsPageHeader />

      {showMetrics ? <JobsSummaryMetrics summary={summary} /> : null}

      <TaskList orgId={orgId} tasks={tasks} currentUserId={userId} />
    </div>
  );
}
