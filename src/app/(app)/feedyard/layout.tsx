import { requireFeedyardEnterprise } from "@/lib/feedyard/enterprise-guard";
import { FeedyardNav } from "@/components/feedyard/feedyard-nav";

export default async function FeedyardLayout({ children }: { children: React.ReactNode }) {
  await requireFeedyardEnterprise();

  return (
    <div className="space-y-5 pb-4">
      <FeedyardNav />
      {children}
    </div>
  );
}
