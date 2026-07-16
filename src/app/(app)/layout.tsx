import { LaorsLogo } from "@/components/brand/laors-logo";
import { AppNav } from "@/components/app/app-nav";
import { GlobalSearch } from "@/components/search/global-search";
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
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border-neutral bg-surface-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <LaorsLogo />
          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-5">
            <GlobalSearch orgId={session.organization!.id} />
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-text-primary lg:inline xl:max-w-xs">
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 pb-24 sm:py-8">
        {children}
      </main>
      <nav className="sticky bottom-0 z-10">
        <AppNav calendarEnabled={calendarEnabled} />
      </nav>
    </div>
  );
}
