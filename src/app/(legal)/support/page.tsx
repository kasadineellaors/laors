import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — LAORS",
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@laorsranch.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.laorsranch.com";

export default function SupportPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-navy">Support</h1>
      <p>
        LAORS helps your team manage cattle, feed, health, labor, and ranch finances. We&apos;re
        here when something isn&apos;t working or you need help getting started.
      </p>

      <h2 className="text-xl font-bold text-navy">Contact</h2>
      <p>
        Email:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brown hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p className="text-sm text-text-secondary">
        Typical response within 1–2 business days. Include your ranch name and a screenshot if
        something looks wrong.
      </p>

      <h2 className="text-xl font-bold text-navy">Common topics</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Sign-in issues</strong> — confirm you&apos;re using the correct email and try{" "}
          <Link href="/forgot-password" className="text-brown hover:underline">
            password reset
          </Link>
          .
        </li>
        <li>
          <strong>New ranch setup</strong> — complete onboarding, then Manage → Properties &amp;
          Locations and receive your first cattle lot.
        </li>
        <li>
          <strong>Team access</strong> — managers invite workers from Manage → Team.
        </li>
        <li>
          <strong>Account deletion</strong> —{" "}
          <Link href="/setup/account" className="text-brown hover:underline">
            Manage → Account
          </Link>
          .
        </li>
      </ul>

      <h2 className="text-xl font-bold text-navy">App &amp; website</h2>
      <p>
        Production app:{" "}
        <a href={APP_URL} className="text-brown hover:underline">{APP_URL}</a>
      </p>

      <h2 className="text-xl font-bold text-navy">Legal</h2>
      <p>
        <Link href="/privacy" className="text-brown hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="text-brown hover:underline">Terms of Service</Link>
      </p>
    </>
  );
}
