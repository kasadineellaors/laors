import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { canManageInvoices, canManageTeam } from "@/lib/auth/roles";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SETUP_LINKS = [
  {
    href: "/setup/locations",
    title: "Ranch Map",
    description: "Properties, locations, and sub-locations",
    managerOnly: false,
  },
  {
    href: "/setup/location-types",
    title: "Location Types",
    description: "What you call your land — traps, pens, sections",
    managerOnly: true,
  },
  {
    href: "/setup/classifications",
    title: "Cattle Classifications",
    description: "Cow, steer, heifer, stocker — your terms",
    managerOnly: true,
  },
  {
    href: "/setup/dictionary",
    title: "Ranch Dictionary",
    description: "Task categories, reasons, financial categories",
    managerOnly: true,
  },
  {
    href: "/setup/ownership",
    title: "Ownership Groups",
    description: "Stocker owners, partners, ranch-owned cattle",
    managerOnly: true,
  },
  {
    href: "/setup/customers",
    title: "Customers",
    description: "Yardage rates, medicine markup, billing contacts",
    managerOnly: true,
    finance: true,
  },
  {
    href: "/setup/team",
    title: "Team",
    description: "Invite managers and workers",
    managerOnly: true,
  },
  {
    href: "/health",
    title: "Health",
    description: "Treatments and medicine catalog",
    managerOnly: false,
  },
  {
    href: "/weather/rainfall",
    title: "Rainfall",
    description: "Rain gauge log",
    managerOnly: false,
  },
  {
    href: "/sales",
    title: "Sales",
    description: "Cattle sales and revenue log",
    managerOnly: false,
  },
  {
    href: "/invoices",
    title: "Invoices",
    description: "Bill customers and track payment status",
    managerOnly: false,
    finance: true,
  },
];

export default async function SetupPage() {
  const session = await requireOnboardedUser();
  const isManager = canManageTeam(session.membership?.system_role);
  const canFinance = canManageInvoices(session.membership?.system_role);

  const links = SETUP_LINKS.filter((link) => {
    if (link.managerOnly && !isManager) return false;
    if (link.finance && !canFinance) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">More</h1>
        <p className="text-charcoal/70">
          Ranch setup, sales, billing, and everything else
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:border-olive hover:bg-olive/5">
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
