import { type NextRequest, NextResponse } from "next/server";
import { completeAuthFromSearchParams } from "@/lib/auth/callback-server";

/** OAuth / PKCE code exchange; hash fragments fall through to the client page. */
export async function GET(request: NextRequest) {
  const result = await completeAuthFromSearchParams(
    request,
    request.nextUrl.searchParams,
  );

  if (result) return result;

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = "/auth/callback/fragment";
  return NextResponse.rewrite(rewriteUrl);
}
