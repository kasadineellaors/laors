import { getAuthFromEmail } from "@/lib/email/auth-emails";
import { getServiceRoleKey } from "@/lib/supabase/service-role";

export function getEmailDeliveryStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!getServiceRoleKey()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    missing.push("RESEND_API_KEY");
  }
  if (!getAuthFromEmail()) {
    missing.push("INVOICE_FROM_EMAIL or AUTH_FROM_EMAIL");
  }
  return { configured: missing.length === 0, missing };
}

export function emailDeliverySetupMessage(): string {
  const { configured, missing } = getEmailDeliveryStatus();
  if (configured) return "";
  return `Add ${missing.join(", ")} to .env.local (or Vercel for production), then restart the dev server.`;
}
