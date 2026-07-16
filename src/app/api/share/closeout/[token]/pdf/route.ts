import { getLotCloseoutPrintData } from "@/lib/lots/closeout-report";
import { resolveCloseoutShareByToken } from "@/lib/lots/closeout-share";
import { closeoutToPdfBuffer } from "@/lib/lots/closeout-pdf";
import { sanitizeFilename } from "@/lib/auth/guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new Response("Invalid share link", { status: 400 });
  }

  const share = await resolveCloseoutShareByToken(token);
  if (!share) {
    return new Response("Share link not found or expired", { status: 404 });
  }

  const printData = await getLotCloseoutPrintData(
    share.organization_id,
    share.cattle_group_id,
    { publicShare: true },
  );
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
