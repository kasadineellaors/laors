import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — LAORS",
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@laorsranch.com";

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-navy">Terms of Service</h1>
      <p className="text-sm text-text-secondary">Last updated: August 17, 2026</p>

      <p>
        By using LAORS (website or mobile app), you agree to these terms. If you use LAORS on
        behalf of a ranch or business, you represent that you have authority to bind that
        organization.
      </p>

      <h2 className="text-xl font-bold text-navy">The service</h2>
      <p>
        LAORS provides software for cattle and ranch operations management. Features may change as
        we improve the product. We strive for high availability but do not guarantee uninterrupted
        access.
      </p>

      <h2 className="text-xl font-bold text-navy">Your responsibilities</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Provide accurate information and keep credentials secure.</li>
        <li>Use LAORS only for lawful ranch and business operations.</li>
        <li>Ensure workers use the app according to your internal policies and permissions.</li>
        <li>You retain ownership of operational data you enter; you grant us permission to host and process it to provide the service.</li>
      </ul>

      <h2 className="text-xl font-bold text-navy">Disclaimer</h2>
      <p>
        LAORS is an operational record system, not veterinary, legal, or financial advice. You are
        responsible for decisions made on the ranch, including animal health, compliance, and
        billing.
      </p>

      <h2 className="text-xl font-bold text-navy">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, LAORS is provided &quot;as is&quot; without
        warranties of any kind. We are not liable for indirect or consequential damages arising
        from use of the service.
      </p>

      <h2 className="text-xl font-bold text-navy">Termination</h2>
      <p>
        You may stop using LAORS at any time and may delete your account from{" "}
        <Link href="/setup/account" className="text-brown hover:underline">
          Manage → Account
        </Link>
        . We may suspend access for abuse, non-payment (if applicable), or legal requirements.
      </p>

      <h2 className="text-xl font-bold text-navy">Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brown hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </>
  );
}
