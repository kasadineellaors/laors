"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OrgActionState = {
  error?: string;
  success?: string;
};

async function requireOrgManager(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member || !["owner", "manager"].includes(member.system_role)) {
    throw new Error("Not authorized");
  }
  return supabase;
}

function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateOrgRanchDetails(
  orgId: string,
  input: {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  },
): Promise<OrgActionState> {
  const name = input.name.trim();
  if (!name) return { error: "Ranch name is required" };

  try {
    const supabase = await requireOrgManager(orgId);
    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        address_line1: trimOrNull(input.addressLine1),
        address_line2: trimOrNull(input.addressLine2),
        city: trimOrNull(input.city),
        state: trimOrNull(input.state),
        zip: trimOrNull(input.zip),
        phone: trimOrNull(input.phone),
      })
      .eq("id", orgId);

    if (error) return { error: error.message };

    revalidatePath("/", "layout");
    revalidatePath("/setup/preferences");
    revalidatePath("/setup");
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    return { success: "Ranch details saved" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save" };
  }
}
