import { NextResponse } from "next/server";

/** Public endpoint to verify which commit is live on Vercel. */
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID ? new Date().toISOString() : null,
    expectedLatest: "quick-add-panels",
    bundle: [
      "owner-totals",
      "misc-charges",
      "cattle-removal",
      "head-days",
      "feedyard",
      "add-hide-panels",
      "phase42-48-billing",
    ],
  });
}
