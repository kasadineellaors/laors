"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logCowCalfActivity } from "@/lib/cow-calf/activity-log";
import type { CowCalfSaleType } from "@/lib/cow-calf/exit-types";
import { markAnimalSold } from "@/lib/cow-calf/exit-sync";

export type CowCalfSaleActionState = {
  error?: string;
  success?: string;
  saleId?: string;
};

const DB_HINT = "Run supabase db push for Phase 38, then retry.";

function revalidateSales() {
  revalidatePath("/cow-calf");
  revalidatePath("/cow-calf/sales");
  revalidatePath("/cow-calf/cows");
  revalidatePath("/cow-calf/calves");
  revalidatePath("/cow-calf/bulls");
}

async function requireMember(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("system_role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) throw new Error("Not authorized");
  return { supabase, user };
}

function computeNet(total: number | null, fees: number | null): number | null {
  if (total == null) return null;
  return Math.round((total - (fees ?? 0)) * 100) / 100;
}

export async function saveCowCalfSale(
  orgId: string,
  input: {
    saleDate?: string;
    buyerName?: string;
    customerId?: string;
    cowCalfHerdId?: string;
    locationId?: string;
    animalIds: string[];
    cowCalfSaleType?: CowCalfSaleType;
    totalAmount?: number;
    pricePerHead?: number;
    fees?: number;
    avgWeightLbs?: number;
    saleReason?: string;
    notes?: string;
  },
): Promise<CowCalfSaleActionState> {
  if (!input.animalIds.length) return { error: "Select at least one animal" };

  try {
    const { supabase, user } = await requireMember(orgId);
    const headCount = input.animalIds.length;
    const saleDate = input.saleDate ?? new Date().toISOString().slice(0, 10);

    let total = input.totalAmount ?? null;
    let perHead = input.pricePerHead ?? null;
    if (total == null && perHead != null) {
      total = Math.round(perHead * headCount * 100) / 100;
    }
    if (total != null && perHead == null && headCount > 0) {
      perHead = Math.round((total / headCount) * 100) / 100;
    }

    const net = computeNet(total, input.fees ?? null);

    const { data: sale, error: saleError } = await supabase
      .from("sales_records")
      .insert({
        organization_id: orgId,
        sale_date: saleDate,
        buyer_name: input.buyerName?.trim() || null,
        customer_id: input.customerId || null,
        cow_calf_herd_id: input.cowCalfHerdId || null,
        location_id: input.locationId || null,
        head_count: headCount,
        total_amount: total,
        price_per_head: perHead,
        avg_weight_lbs: input.avgWeightLbs ?? null,
        fees: input.fees ?? null,
        net_amount: net,
        sale_reason: input.saleReason?.trim() || null,
        sale_context: "cow_calf",
        cow_calf_sale_type: input.cowCalfSaleType ?? "calf",
        animal_ids: input.animalIds,
        inventory_deducted: false,
        individual_animal_id: headCount === 1 ? input.animalIds[0] : null,
        notes: input.notes?.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (saleError) return { error: `${saleError.message} — ${DB_HINT}` };

    for (const animalId of input.animalIds) {
      const { data: animal } = await supabase
        .from("individual_animals")
        .select("animal_type")
        .eq("id", animalId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (animal) {
        await markAnimalSold(supabase, orgId, animalId, animal.animal_type);
      }
    }

    await logCowCalfActivity({
      organizationId: orgId,
      action: "sale",
      summary: `Sold ${headCount} head${input.buyerName ? ` to ${input.buyerName.trim()}` : ""}.`,
      herdId: input.cowCalfHerdId ?? null,
      sourceTable: "sales_records",
      sourceId: sale.id,
      userId: user.id,
      details: { headCount, animalIds: input.animalIds },
    });

    revalidateSales();
    return { success: "Sale recorded", saleId: sale.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function archiveCowCalfSale(orgId: string, saleId: string): Promise<CowCalfSaleActionState> {
  try {
    const { supabase } = await requireMember(orgId);
    const { error } = await supabase
      .from("sales_records")
      .update({ is_active: false })
      .eq("id", saleId)
      .eq("organization_id", orgId)
      .eq("sale_context", "cow_calf");

    if (error) return { error: error.message };
    revalidateSales();
    return { success: "Sale archived" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
