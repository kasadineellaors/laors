import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailConfirmUrl } from "@/lib/auth/confirm-url";

type LinkResult =
  | { ok: true; actionLink: string; emailOtp: string }
  | { ok: false; error: string; existingAccount?: boolean };

export async function createSignUpConfirmationLink(input: {
  email: string;
  password?: string;
  fullName?: string;
  redirectTo: string;
}): Promise<LinkResult> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Sign-up email is not configured on the server. Add SUPABASE_SERVICE_ROLE_KEY to Vercel and .env.local.",
    };
  }

  const options = {
    redirectTo: input.redirectTo,
    data: input.fullName ? { full_name: input.fullName } : undefined,
  };

  let result = input.password
    ? await admin.auth.admin.generateLink({
        type: "signup",
        email: input.email,
        password: input.password,
        options,
      })
    : await admin.auth.admin.generateLink({
        type: "magiclink",
        email: input.email,
        options,
      });

  if (result.error && input.password) {
    const message = result.error.message.toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      result = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: input.email,
        options,
      });
    }
  }

  if (result.error) {
    const message = result.error.message.toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      return { ok: false, error: result.error.message, existingAccount: true };
    }
    return { ok: false, error: result.error.message };
  }

  const properties = result.data.properties ?? {};
  const confirmUrl = buildEmailConfirmUrl(input.redirectTo, properties);
  const emailOtp = properties.email_otp?.trim();
  if (!confirmUrl || !emailOtp) {
    return { ok: false, error: "Could not generate confirmation link." };
  }

  return { ok: true, actionLink: confirmUrl, emailOtp };
}
