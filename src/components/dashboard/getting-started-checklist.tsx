import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GettingStartedChecklistProps {
  totalHead: number;
  hasLocations: boolean;
  canManageTeam: boolean;
  canWriteInventory: boolean;
}

export function GettingStartedChecklist({
  totalHead,
  hasLocations,
  canManageTeam,
  canWriteInventory,
}: GettingStartedChecklistProps) {
  const items = [
    {
      done: hasLocations,
      label: "Set up your ranch map",
      href: "/setup/locations",
      cta: "Ranch map",
    },
    {
      done: totalHead > 0,
      label: "Create a cattle group with head count",
      href: canWriteInventory ? "/cattle/new" : "/cattle",
      cta: canWriteInventory ? "Add group" : "View cattle",
    },
    {
      done: false,
      label: "Log a job or clock in for the day",
      href: "/jobs",
      cta: "Jobs",
      optional: true,
    },
    ...(canManageTeam
      ? [
          {
            done: false,
            label: "Invite your team (requires service role key)",
            href: "/setup/team",
            cta: "Team",
            optional: true,
          },
        ]
      : []),
  ];

  const incomplete = items.filter((i) => !i.done && !i.optional);
  if (incomplete.length === 0 && totalHead > 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting started</CardTitle>
        <CardDescription>Finish these to make LAORS operational on your ranch</CardDescription>
      </CardHeader>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-border-neutral px-3 py-2"
          >
            <div className="flex items-start gap-2">
              <span
                className={
                  item.done
                    ? "mt-0.5 text-status-success"
                    : "mt-0.5 text-text-secondary"
                }
                aria-hidden
              >
                {item.done ? "✓" : "○"}
              </span>
              <span
                className={
                  item.done
                    ? "text-sm text-text-secondary line-through"
                    : "text-sm text-text-primary"
                }
              >
                {item.label}
              </span>
            </div>
            {!item.done ? (
              <Link href={item.href}>
                <Button size="sm" variant="secondary">
                  {item.cta}
                </Button>
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
