/** Server-only Supabase service role key (accepts legacy Vercel name `service_role`). */
export function getServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.service_role?.trim() ||
    undefined
  );
}
