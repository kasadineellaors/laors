import { listFeedingRecords } from "@/lib/feed/queries";
import { listCattleGroups } from "@/lib/inventory/queries";
import { ENTERPRISE_LABELS, LOT_STATUS_LABELS, type EnterpriseType, type LotStatus } from "@/lib/lots/types";
import { listSales } from "@/lib/sales/queries";
import type { SearchResponse, SearchResult } from "./types";

const PER_KIND_LIMIT = 8;
const FETCH_LIMIT = 300;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesHaystack(haystack: Array<string | null | undefined>, query: string): boolean {
  if (!query) return false;
  return haystack
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(m)}/${Number(d)}/${y}`;
}

function money(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export async function searchRanch(orgId: string, rawQuery: string): Promise<SearchResponse> {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) {
    return { query: rawQuery.trim(), results: [], counts: { lots: 0, sales: 0, feedings: 0 } };
  }

  const [groups, sales, feedings] = await Promise.all([
    listCattleGroups(orgId),
    listSales(orgId, FETCH_LIMIT),
    listFeedingRecords(orgId, { limit: FETCH_LIMIT }),
  ]);

  const lotResults: SearchResult[] = [];
  for (const group of groups) {
    if (
      !matchesHaystack(
        [
          group.lot_number,
          group.name,
          group.location_breadcrumb,
          group.ownership_group_name,
          group.customer_name,
          group.seller_name,
          group.source_name,
          group.notes,
          ENTERPRISE_LABELS[group.enterprise_type as EnterpriseType],
          LOT_STATUS_LABELS[group.lot_status as LotStatus],
        ],
        query,
      )
    ) {
      continue;
    }

    const label = group.lot_number || group.name;
    const status =
      LOT_STATUS_LABELS[group.lot_status as LotStatus] ?? group.lot_status;
    const enterprise =
      ENTERPRISE_LABELS[group.enterprise_type as EnterpriseType] ??
      group.enterprise_type;

    lotResults.push({
      id: group.id,
      kind: "lot",
      title: label,
      subtitle: [
        status,
        enterprise,
        group.total_head > 0 ? `${group.total_head} hd` : null,
        group.location_breadcrumb,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/cattle/groups/${group.id}`,
    });
    if (lotResults.length >= PER_KIND_LIMIT) break;
  }

  const saleResults: SearchResult[] = [];
  for (const sale of sales) {
    if (
      !matchesHaystack(
        [
          sale.buyer_name,
          sale.customer_name,
          sale.cattle_group_name,
          sale.location_label,
          sale.individual_animal_tag,
          sale.notes,
          sale.sale_date,
          formatDate(sale.sale_date),
        ],
        query,
      )
    ) {
      continue;
    }

    const buyer = sale.customer_name || sale.buyer_name || "Sale";
    saleResults.push({
      id: sale.id,
      kind: "sale",
      title: `${buyer} — ${sale.head_count} hd`,
      subtitle: [
        formatDate(sale.sale_date),
        sale.cattle_group_name,
        money(sale.total_amount),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/sales/${sale.id}`,
    });
    if (saleResults.length >= PER_KIND_LIMIT) break;
  }

  const feedingResults: SearchResult[] = [];
  for (const feeding of feedings) {
    if (
      !matchesHaystack(
        [
          feeding.cattle_group_name,
          feeding.location_label,
          feeding.feed_ration_name,
          feeding.ownership_group_name,
          feeding.fed_by_name,
          feeding.notes,
          feeding.fed_at,
          formatDate(feeding.fed_at),
        ],
        query,
      )
    ) {
      continue;
    }

    feedingResults.push({
      id: feeding.id,
      kind: "feeding",
      title: feeding.feed_ration_name,
      subtitle: [
        formatDate(feeding.fed_at),
        feeding.cattle_group_name,
        feeding.location_label,
        `${feeding.quantity} ${feeding.feed_ration_unit}`,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/feed/log/${feeding.id}`,
    });
    if (feedingResults.length >= PER_KIND_LIMIT) break;
  }

  return {
    query: rawQuery.trim(),
    results: [...lotResults, ...saleResults, ...feedingResults],
    counts: {
      lots: lotResults.length,
      sales: saleResults.length,
      feedings: feedingResults.length,
    },
  };
}
