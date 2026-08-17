import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — LAORS",
  description: "How LAORS collects, uses, and protects ranch operational data.",
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@laorsranch.com";

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-navy">Privacy Policy</h1>
      <p className="text-sm text-text-secondary">Last updated: August 17, 2026</p>

      <p>
        LAORS (&quot;The Foreman&quot;) helps cattle operations manage inventory, labor, health,
        feed, and business records. This policy describes how we handle information when you use
        our website and mobile applications.
      </p>

      <h2 className="text-xl font-bold text-navy">Information we collect</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Account data</strong> — name, email, password (stored securely by our auth
          provider), and ranch profile details you enter during onboarding.
        </li>
        <li>
          <strong>Operational data</strong> — cattle lots, moves, treatments, feed logs, tasks,
          sales, invoices, and other records you submit as part of running your operation.
        </li>
        <li>
          <strong>Usage data</strong> — basic logs from our hosting providers (e.g. request
          timestamps, device/browser type) to keep the service secure and reliable.
        </li>
      </ul>

      <h2 className="text-xl font-bold text-navy">How we use information</h2>
      <p>
        We use your data to provide LAORS, authenticate users, enforce role-based access within
        your ranch organization, generate reports and invoices you request, and improve reliability
        and security. We do not sell your ranch operational data.
      </p>

      <h2 className="text-xl font-bold text-navy">Where data is stored</h2>
      <p>
        LAORS is hosted on modern cloud infrastructure (application hosting and database services).
        Data is stored in the United States unless your organization configures otherwise through
        enterprise agreements.
      </p>

      <h2 className="text-xl font-bold text-navy">Sharing</h2>
      <p>
        We share data only with service providers that help us operate LAORS (hosting, database,
        email delivery when enabled), when required by law, or when you explicitly export or share
        records (e.g. customer portal links, PDF exports).
      </p>

      <h2 className="text-xl font-bold text-navy">Your choices</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Update ranch and profile information in Manage → Ranch Settings.</li>
        <li>
          Request account deletion in{" "}
          <Link href="/setup/account" className="text-brown hover:underline">
            Manage → Account
          </Link>
          .
        </li>
        <li>Contact us for data questions at {SUPPORT_EMAIL}.</li>
      </ul>

      <h2 className="text-xl font-bold text-navy">Security</h2>
      <p>
        We use industry-standard practices including encrypted connections (HTTPS), authenticated
        access, and row-level security in our database so ranch data is isolated by organization.
      </p>

      <h2 className="text-xl font-bold text-navy">Children</h2>
      <p>LAORS is a business operations tool not directed at children under 13.</p>

      <h2 className="text-xl font-bold text-navy">Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brown hover:underline">
          {SUPPORT_EMAIL}
        </a>
        . See also our <Link href="/support" className="text-brown hover:underline">Support</Link>{" "}
        page.
      </p>
    </>
  );
}
