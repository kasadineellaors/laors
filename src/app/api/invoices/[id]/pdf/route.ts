import { getInvoicePrintData } from "@/lib/invoices/queries";
import { invoiceToPdfBuffer } from "@/lib/invoices/pdf";
import { PERMISSIONS } from "@/lib/permissions/roles";
import { AuthGuardError, assertUuid, authorizeApi, sanitizeFilename } from "@/lib/auth/guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    assertUuid(id, "invoice id");
  } catch (e) {
    if (e instanceof AuthGuardError) {
      return new Response(e.message, { status: e.status });
    }
    return new Response("Invalid invoice id", { status: 400 });
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

  const auth = await authorizeApi(orgId, PERMISSIONS.REPORTS_EXPORT);
  if (!auth.ok) {
    return auth.response;
  }

  const printData = await getInvoicePrintData(orgId, id);
  if (!printData) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = invoiceToPdfBuffer(printData);
  const filename = sanitizeFilename(`${printData.invoice.invoice_number}.pdf`, "invoice.pdf");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
