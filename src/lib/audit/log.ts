import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function logAuditEvent(
  orgId: string,
  input: {
    action: string;
    tableName: string;
    recordId?: string | null;
    oldData?: Json | null;
    newData?: Json | null;
    userId?: string | null;
  },
): Promise<void> {
  try {
    const supabase = await createClient();
    let userId = input.userId;
    if (userId === undefined) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }

    await supabase.from("audit_log").insert({
      organization_id: orgId,
      user_id: userId,
      action: input.action,
      table_name: input.tableName,
      record_id: input.recordId ?? null,
      old_data: input.oldData ?? null,
      new_data: input.newData ?? null,
    });
  } catch {
    // Audit logging should not block primary operations.
  }
}
