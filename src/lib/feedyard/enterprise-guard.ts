import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasStockerMode } from "@/lib/stocker/constants";
import type { OperationMode } from "@/types/auth";

/** Feedyard workspace requires stocker/custom-fed operations. */
export async function requireFeedyardEnterprise() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];

  if (!hasStockerMode(modes)) {
    redirect("/dashboard");
  }

  return session;
}
