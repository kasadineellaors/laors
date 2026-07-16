import { LaorsLogo } from "@/components/brand/laors-logo";
import { GlobalSearch } from "@/components/search/global-search";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  orgName?: string | null;
  orgId: string;
}

export function AppHeader({ orgName, orgId }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-neutral bg-surface-white px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <LaorsLogo />
          <p className="hidden text-xs font-medium text-text-secondary sm:block">The Foreman</p>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-5">
          <GlobalSearch orgId={orgId} />
          {orgName ? (
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-text-primary lg:inline xl:max-w-xs">
              {orgName}
            </span>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
