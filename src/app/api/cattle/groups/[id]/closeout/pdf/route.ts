import { getLotCloseoutPrintData } from "@/lib/lots/closeout-report";
import { closeoutToPdfBuffer } from "@/lib/lots/closeout-pdf";
import { AuthGuardError, assertUuid, sanitizeFilename } from "@/lib/auth/guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    assertUuid(id, "lot id");
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return new Response(e.message, { status: e.status });
    }
    return new Response("Invalid lot id", { status: 400 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_org_id")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = profile?.default_org_id;
  if (!orgId) {
    return new Response("Forbidden", { status: 403 });
  }

  const printData = await getLotCloseoutPrintData(orgId, id);
  if (!printData) {
    return new Response("Lot not found", { status: 404 });
  }

  const buffer = closeoutToPdfBuffer(printData);
  const filename = sanitizeFilename(`${printData.lotLabel}-closeout.pdf`, "lot-closeout.pdf");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
