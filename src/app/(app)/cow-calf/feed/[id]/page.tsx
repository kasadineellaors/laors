import { redirect } from "next/navigation";

export default async function LegacyCowCalfFeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/feed/cow-calf/${id}`);
}
