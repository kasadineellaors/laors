import { createClient } from "@/lib/supabase/server";
import { getAuthRedirectPath } from "@/lib/auth/redirects";
import { getUserSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const session = await getUserSession();
      return NextResponse.redirect(`${origin}${getAuthRedirectPath(session)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=email_link_failed`);
}
