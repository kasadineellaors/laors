import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/session";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HEALTH_LINKS = [
  {
    href: "/health/treatments",
    title: "Treatments",
    description: "Vaccines, antibiotics, dewormers — with type and reason",
  },
  {
    href: "/health/medicine",
    title: "Medicine inventory",
    description: "On-hand supplies and stock levels",
  },
];

export default async function HealthPage() {
  await requireOnboardedUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Health</h1>
        <p className="text-charcoal/70">Treatments and medicine on the ranch</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {HEALTH_LINKS.map((link) => (
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
