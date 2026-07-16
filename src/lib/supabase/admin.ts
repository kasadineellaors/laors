import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { getServiceRoleKey } from "./service-role";

/** Server-only client that bypasses RLS. Requires SUPABASE_SERVICE_ROLE_KEY. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceRoleKey();

  if (!url || !key) return null;

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
