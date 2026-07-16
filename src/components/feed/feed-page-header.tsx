import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FeedPageHeaderProps {
  logFeedingHref?: string;
}

export function FeedPageHeader({ logFeedingHref = "/feed/log/new" }: FeedPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">Feed</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track feed inventory, rations, usage, and cost.
        </p>
      </div>
      <Link href={logFeedingHref} className="sm:shrink-0">
        <Button size="md" fullWidth className="sm:w-auto">
          + Log Feeding
        </Button>
      </Link>
    </div>
  );
}
