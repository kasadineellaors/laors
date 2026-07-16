import { type NextRequest, NextResponse } from "next/server";

/** Legacy direct links: forward to the interactive verify page (no auto-verify on GET). */
export async function GET(request: NextRequest) {
  const verifyUrl = request.nextUrl.clone();
  verifyUrl.pathname = "/signup/verify";
  return NextResponse.redirect(verifyUrl);
}
