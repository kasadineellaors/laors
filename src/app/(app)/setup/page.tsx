import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices, canManageTeam } from "@/lib/auth/roles";
import { ManagePageHeader } from "@/components/setup/manage-page-header";
import { ManageNavCard } from "@/components/setup/manage-nav-card";
import { ManageNavRow } from "@/components/setup/manage-nav-row";
import { ManageSubpageShell } from "@/components/setup/manage-subpage-shell";

export const metadata: Metadata = {
  title: "Manage — LAORS",
};

export default async function SetupPage() {
  const session = await requireOnboardedUser();
  const isManager = canManageTeam(session.membership?.system_role);
  const canFinance = canManageInvoices(session.membership?.system_role);

  return (
    <ManageSubpageShell className="space-y-8">
      <ManagePageHeader />

      <section aria-labelledby="ranch-setup-heading">
        <h2
          id="ranch-setup-heading"
          className="mb-3 text-sm font-bold uppercase tracking-wide text-slate"
        >
          Ranch Setup
        </h2>
        <div className="space-y-3">
          <ManageNavCard
            href="/setup/locations"
            title="Properties & Locations"
            description="Organize properties, pastures, pens, traps, feedyards, and other ranch locations."
          />
          {isManager ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <ManageNavRow
                href="/setup/location-types"
                title="Location Types"
                description="Customize names such as pasture, pen, trap, section, and feedyard."
              />
              <ManageNavRow
                href="/setup/classifications"
                title="Cattle Types"
                description="Customize cattle classes such as cow, calf, bull, steer, heifer, and stocker."
              />
              <ManageNavRow
                href="/setup/lot-labels"
                title="Lot Names"
                description="Saved lot names for quick selection when receiving cattle."
              />
              <ManageNavRow
                href="/setup/dictionary"
                title="Categories & Labels"
                description="Manage task categories, treatment reasons, and financial labels."
              />
            </div>
          ) : null}
        </div>
      </section>

      {isManager || canFinance ? (
        <section aria-labelledby="people-business-heading">
          <h2
            id="people-business-heading"
            className="mb-3 text-sm font-bold uppercase tracking-wide text-slate"
          >
            People & Business
          </h2>
          <div className="space-y-3">
            {canFinance ? (
              <ManageNavCard
                href="/setup/owners"
                title="Owners & Clients"
                description="Manage cattle ownership, billing rates, charges, and client access."
              />
            ) : null}
            {isManager ? (
              <ManageNavCard
                href="/setup/team"
                title="Team"
                description="Invite workers, assign roles, and manage permissions."
              />
            ) : null}
            {canFinance ? (
              <ManageNavCard
                href="/invoices"
                title="Sales & Billing"
                description="Manage invoices, charges, payments, and sales settings."
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="records-admin-heading">
        <h2
          id="records-admin-heading"
          className="mb-3 text-sm font-bold uppercase tracking-wide text-slate"
        >
          Records & Administration
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {isManager ? (
            <ManageNavRow
              href="/setup/audit"
              title="Activity Log"
              description="See who created, changed, moved, sold, or exported records."
            />
          ) : null}
          <ManageNavRow
            href="/setup/exports"
            title="Export Records"
            description="Download cattle, treatment, feed, sales, and financial records."
          />
          {isManager ? (
            <ManageNavRow
              href="/setup/preferences"
              title="Ranch Settings"
              description="Manage ranch details, preferences, and account settings."
            />
          ) : null}
        </div>
      </section>
    </ManageSubpageShell>
  );
}
