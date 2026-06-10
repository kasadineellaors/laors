import { LaorsLogo } from "@/components/brand/laors-logo";
import { AppNav } from "@/components/app/app-nav";
import { signOut } from "@/lib/actions/auth";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isCalendarEnabled } from "@/lib/org/settings";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOnboardedUser();
  const calendarEnabled = isCalendarEnabled(session.organization);

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <LaorsLogo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-charcoal sm:inline">
              {session.organization?.name}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
      <nav className="sticky bottom-0 border-t border-border bg-surface px-2 py-2">
        <AppNav calendarEnabled={calendarEnabled} />
      </nav>
    </div>
  );
}
