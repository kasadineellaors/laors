import type { Metadata } from "next";
import { requireCowCalfEnterprise } from "@/lib/cow-calf/enterprise-guard";
import { createClient } from "@/lib/supabase/server";
import { HerdForm } from "@/components/cow-calf/herd-form";
import { AppPageHeader } from "@/components/layout/app-page-header";

export const metadata: Metadata = {
  title: "New Herd — Cow-Calf — LAORS",
};

export default async function NewHerdPage() {
  const session = await requireCowCalfEnterprise();
  const orgId = session.organization!.id;
  const supabase = await createClient();

  const [{ data: locations }, { data: owners }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("owners")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <AppPageHeader title="Create herd" subtitle="Set up a cow-calf pasture group." />
      <HerdForm
        organizationId={orgId}
        locations={(locations ?? []).map((l) => ({ id: l.id, name: l.name }))}
        owners={(owners ?? []).map((o) => ({ id: o.id, name: o.name }))}
      />
    </div>
  );
}
