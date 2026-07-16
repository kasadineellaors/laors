import type { Metadata } from "next";
import Link from "next/link";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { canWriteInventory } from "@/lib/auth/roles";
import { listCowCalfHerdOptions } from "@/lib/cow-calf/breeding-queries";
import { listProcessingEvents, getProcessingSummary } from "@/lib/cow-calf/processing-queries";
import { PROCESSING_EVENT_TYPE_LABELS } from "@/lib/cow-calf/constants";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Processing — Cow-Calf — LAORS",
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CowCalfProcessingPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const canManage = canWriteInventory(session.membership?.system_role);

  const [events, summary] = await Promise.all([
    listProcessingEvents(orgId),
    getProcessingSummary(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AppPageHeader
          title="Processing"
          subtitle={`${summary.unprocessedCalves} calves not birth-processed · ${summary.thisMonth} events this month`}
        />
        {canManage ? (
          <Link href="/cow-calf/processing/new">
            <Button size="lg">+ Process calves</Button>
          </Link>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-neutral px-4 py-8 text-center text-sm text-text-secondary">
          No processing events yet. Record birth processing, branding, vaccination, or castration for
          calves at side.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-border-neutral bg-surface-white px-4 py-4"
            >
              <p className="font-semibold text-navy">
                {PROCESSING_EVENT_TYPE_LABELS[event.event_type]}
                {event.herd_name ? ` · ${event.herd_name}` : ""}
              </p>
              <p className="text-sm text-text-secondary">
                {formatDate(event.processed_at)} · {event.calf_count} calf
                {event.calf_count === 1 ? "" : "ves"}
                {event.product_name ? ` · ${event.product_name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
