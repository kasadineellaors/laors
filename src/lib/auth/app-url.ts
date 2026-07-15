import { headers } from "next/headers";

/** Production-safe app origin for Supabase auth redirect URLs. */
export async function getAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && !configured.includes("localhost")) {
    return configured;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host && !host.includes("localhost")) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return configured ?? "http://localhost:3000";
}
