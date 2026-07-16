import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CloseoutShareRecord = {
  share_token: string;
  last_emailed_at: string | null;
  last_emailed_to: string | null;
};

export type ResolvedCloseoutShare = {
  organization_id: string;
  cattle_group_id: string;
  share_token: string;
};

function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function getCloseoutShareForLot(
  orgId: string,
  groupId: string,
): Promise<CloseoutShareRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lot_closeout_shares")
    .select("share_token, last_emailed_at, last_emailed_to")
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return data;
}

export async function ensureCloseoutShare(
  orgId: string,
  groupId: string,
  createdBy?: string,
): Promise<CloseoutShareRecord> {
  const existing = await getCloseoutShareForLot(orgId, groupId);
  if (existing) return existing;

  const supabase = await createClient();
  const shareToken = generateShareToken();

  const { data, error } = await supabase
    .from("lot_closeout_shares")
    .insert({
      organization_id: orgId,
      cattle_group_id: groupId,
      share_token: shareToken,
      created_by: createdBy ?? null,
    })
    .select("share_token, last_emailed_at, last_emailed_to")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create share link");
  }

  return data;
}

export async function resolveCloseoutShareByToken(
  token: string,
): Promise<ResolvedCloseoutShare | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("lot_closeout_shares")
    .select("organization_id, cattle_group_id, share_token")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

export async function markCloseoutShareEmailed(
  orgId: string,
  groupId: string,
  email: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("lot_closeout_shares")
    .update({
      last_emailed_at: new Date().toISOString(),
      last_emailed_to: email,
    })
    .eq("organization_id", orgId)
    .eq("cattle_group_id", groupId)
    .eq("is_active", true);
}
