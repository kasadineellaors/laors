import type { Metadata } from "next";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reports — Cow-Calf — LAORS",
};

export default function CowCalfReportsPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Cow-Calf reports"
        subtitle="Inventory, reproduction, calving, and weaning — separate from Stocker P&L."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 5</CardTitle>
          <CardDescription>
            Reproduction, calving, weaning, and bull reports will be added here. Stocker closeout and
            enterprise P&L reports are unchanged.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
