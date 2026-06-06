import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { getTask, listOrgMembers } from "@/lib/tasks/queries";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export const metadata: Metadata = {
  title: "Task — LAORS",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [task, categories, locations, groups, members] = await Promise.all([
    getTask(orgId, id),
    getRanchOptions(orgId, "task_categories"),
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then((gs) =>
      gs.map((g) => ({
        value: g.id,
        label: `${g.name} (${g.total_head} hd)`,
      })),
    ),
    listOrgMembers(orgId),
  ]);

  if (!task) notFound();

  return (
    <TaskDetailClient
      orgId={orgId}
      task={task}
      categoryOptions={categories}
      locationOptions={locations}
      groupOptions={groups}
      memberOptions={members}
    />
  );
}
