import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/guards";
import { searchRanch } from "@/lib/search/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  const q = searchParams.get("q") ?? "";

  if (!orgId) {
    return new Response("Missing orgId", { status: 400 });
  }

  const auth = await authorizeApi(orgId);
  if (!auth.ok) {
    return auth.response;
  }

  const data = await searchRanch(orgId, q);
  return NextResponse.json(data);
}
