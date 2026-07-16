import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { hasCowCalfMode } from "@/lib/cow-calf/constants";
import type { OperationMode } from "@/types/auth";

/** Server-side guard: Cow-Calf enterprise pages only. Stocker routes never call this. */
export async function requireCowCalfEnterprise() {
  const session = await requireOnboardedUser();
  const modes = (session.organization!.enabled_modes ?? []) as OperationMode[];

  if (!hasCowCalfMode(modes)) {
    redirect("/cattle");
  }

  return session;
}
