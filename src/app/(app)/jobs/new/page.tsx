import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getRanchOptions, getTreePickerOptions } from "@/lib/locations/options";
import { listCattleGroups } from "@/lib/inventory/queries";
import { toFeedGroupOptions } from "@/lib/feed/options";
import { listOrgMembers } from "@/lib/tasks/queries";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = {
  title: "New Task — LAORS",
};

export default async function NewTaskPage() {
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;
  const userId = session.user.id;

  const [categories, locations, groups, members] = await Promise.all([
    getRanchOptions(orgId, "task_categories"),
    getTreePickerOptions(orgId).then((nodes) =>
      nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
    ),
    listCattleGroups(orgId).then(toFeedGroupOptions),
    listOrgMembers(orgId),
  ]);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <Link href="/jobs" className="text-sm font-medium text-brown hover:underline">
          ← Jobs
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
          New task
        </h1>
      </div>
      <TaskForm
        orgId={orgId}
        currentUserId={userId}
        categoryOptions={categories}
        locationOptions={locations}
        groupOptions={groups}
        memberOptions={members}
      />
    </div>
  );
}
