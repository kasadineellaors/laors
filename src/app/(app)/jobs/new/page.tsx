import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { listOrgMembers } from "@/lib/tasks/queries";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = {
  title: "New Task — LAORS",
};

export default async function NewTaskPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const [categories, locations, groups, members] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm font-medium text-olive hover:underline">
          ← Jobs
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-charcoal">New task</h1>
      </div>
      <TaskForm
        orgId={orgId}
        categoryOptions={categories}
        locationOptions={locations}
        groupOptions={groups}
        memberOptions={members}
      />
    </div>
  );
}
