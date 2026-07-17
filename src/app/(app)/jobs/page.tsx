import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listArchivedTasks, listTasks } from "@/lib/tasks/queries";
import { computeJobsSummary } from "@/lib/tasks/summary";
import { JobsPageHeader } from "@/components/tasks/jobs-page-header";
import { JobsSummaryMetrics } from "@/components/tasks/jobs-summary-metrics";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { TaskList } from "@/components/tasks/task-list";

export const metadata: Metadata = {
  title: "Jobs — LAORS",
};

export default async function JobsPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;

  const [tasks, archivedTasks] = await Promise.all([
    listTasks(orgId, "all"),
    listArchivedTasks(orgId),
  ]);
  const summary = computeJobsSummary(tasks);
  const showMetrics = tasks.length > 0;

  return (
    <AppPageShell>
      <JobsPageHeader />

      {showMetrics ? <JobsSummaryMetrics summary={summary} /> : null}

      <TaskList orgId={orgId} tasks={tasks} archivedTasks={archivedTasks} currentUserId={userId} />
    </AppPageShell>
  );
}
