import type { OperationMode } from "@/types/auth";
import { requireOnboardedUser } from "@/lib/auth/session";
import { resolveVisibleModules } from "@/lib/auth/modules";
import type { SystemRole } from "@/types/database";
import { hasCowCalfMode, hasStockerMode, showEnterpriseSwitcher } from "@/lib/enterprise/ui";
import { AppHeader } from "@/components/layout/app-header";
import { AppNav } from "@/components/app/app-nav";
import { ModuleGuard } from "@/components/app/module-guard";
import { EnterpriseSwitcher } from "@/components/enterprise/enterprise-switcher";
import { isCalendarEnabled } from "@/lib/org/settings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOnboardedUser();
  const org = session.organization!;
  const calendarEnabled = isCalendarEnabled(org);
  const modes = (org.enabled_modes ?? []) as OperationMode[];
  const membershipRole = (session.membership?.system_role ?? "worker") as SystemRole;
  const visibleModules = resolveVisibleModules(
    membershipRole,
    session.membership?.visible_modules,
  );

  return (
    <div className="flex min-h-full flex-col bg-background">
      <ModuleGuard visibleModules={visibleModules} />
      <AppHeader orgName={org.name} orgId={org.id} />
      {showEnterpriseSwitcher(modes) ? (
        <EnterpriseSwitcher
          showStocker={hasStockerMode(modes)}
          showCowCalf={hasCowCalfMode(modes)}
        />
      ) : null}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 pb-24 sm:px-6 sm:py-8">
        {children}
      </main>
      <nav className="sticky bottom-0 z-10">
        <AppNav
          calendarEnabled={calendarEnabled}
          enabledModes={modes}
          visibleModules={visibleModules}
        />
      </nav>
    </div>
  );
}
