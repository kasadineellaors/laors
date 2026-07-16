import type { EmailOtpType } from "@supabase/supabase-js";

const VERIFY_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/** Map generateLink verification_type to verifyOtp type. */
export function toVerifyOtpType(verificationType: string): EmailOtpType {
  if (VERIFY_OTP_TYPES.has(verificationType as EmailOtpType)) {
    return verificationType as EmailOtpType;
  }
  return "signup";
}

export function buildEmailConfirmUrl(
  redirectTo: string,
  properties: {
    hashed_token?: string | null;
    verification_type?: string | null;
  },
): string | null {
  const hashedToken = properties.hashed_token?.trim();
  if (!hashedToken) return null;

  const url = new URL(redirectTo);
  url.searchParams.set("token_hash", hashedToken);
  url.searchParams.set(
    "type",
    toVerifyOtpType(properties.verification_type ?? "signup"),
  );
  return url.toString();
}
