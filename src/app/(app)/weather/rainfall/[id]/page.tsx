import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTreePickerOptions } from "@/lib/locations/options";
import { getRainfall } from "@/lib/weather/queries";
import { RainfallDetailClient } from "@/components/weather/rainfall-detail-client";

export const metadata: Metadata = {
  title: "Rainfall — LAORS",
};

export default async function RainfallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOnboardedUser();
  const orgId = session.organization!.id;

  const record = await getRainfall(orgId, id);
  if (!record) notFound();

  const locations = await getTreePickerOptions(orgId).then((nodes) =>
    nodes.map((n) => ({ value: n.id, label: n.breadcrumb })),
  );

  return (
    <RainfallDetailClient orgId={orgId} record={record} locationOptions={locations} />
  );
}
