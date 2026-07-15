import { sendEmail } from "@/lib/email/resend";

export function getAuthFromEmail(): string | null {
  return (
    process.env.AUTH_FROM_EMAIL?.trim() ||
    process.env.INVOICE_FROM_EMAIL?.trim() ||
    null
  );
}

export function isAuthEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      getAuthFromEmail() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function confirmationEmailHtml(fullName: string | undefined, confirmUrl: string): string {
  const greeting = fullName?.trim() ? `Hi ${fullName.trim()},` : "Hi,";
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #2c2c2c;">
      <p style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">LAORS</p>
      <p>${greeting}</p>
      <p>Confirm your email to finish creating your LAORS account.</p>
      <p style="margin: 28px 0;">
        <a href="${confirmUrl}" style="background: #4a5d3b; color: #fff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Confirm my email
        </a>
      </p>
      <p style="font-size: 14px; color: #666;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 14px; word-break: break-all;"><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p style="font-size: 13px; color: #888; margin-top: 32px;">If you did not sign up for LAORS, you can ignore this email.</p>
    </div>
  `.trim();
}

export async function sendSignUpConfirmationEmail(input: {
  to: string;
  fullName?: string;
  confirmUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = getAuthFromEmail();
  if (!from) {
    return {
      ok: false,
      error:
        "Auth email sender is not configured. Set AUTH_FROM_EMAIL or INVOICE_FROM_EMAIL in your environment.",
    };
  }

  return sendEmail({
    from,
    to: input.to,
    subject: "Confirm your LAORS account",
    html: confirmationEmailHtml(input.fullName, input.confirmUrl),
  });
}

function teamInviteEmailHtml(orgName: string | undefined, inviteUrl: string): string {
  const ranch = orgName?.trim() || "a LAORS ranch";
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; color: #2c2c2c;">
      <p style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">LAORS</p>
      <p>You have been invited to join <strong>${ranch}</strong> on LAORS.</p>
      <p>Click below to accept the invite and set up your account.</p>
      <p style="margin: 28px 0;">
        <a href="${inviteUrl}" style="background: #4a5d3b; color: #fff; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Accept invite
        </a>
      </p>
      <p style="font-size: 14px; color: #666;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 14px; word-break: break-all;"><a href="${inviteUrl}">${inviteUrl}</a></p>
    </div>
  `.trim();
}

export async function sendTeamInviteEmail(input: {
  to: string;
  orgName?: string;
  inviteUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = getAuthFromEmail();
  if (!from) {
    return {
      ok: false,
      error:
        "Email sender is not configured. Set AUTH_FROM_EMAIL or INVOICE_FROM_EMAIL in your environment.",
    };
  }

  return sendEmail({
    from,
    to: input.to,
    subject: "You are invited to LAORS",
    html: teamInviteEmailHtml(input.orgName, input.inviteUrl),
  });
}
