import { getFirstName, getTimeGreeting } from "@/lib/dashboard/greeting";

interface DashboardGreetingProps {
  fullName?: string | null;
}

export function DashboardGreeting({ fullName }: DashboardGreetingProps) {
  const greeting = getTimeGreeting();
  const name = getFirstName(fullName);

  return (
    <header className="space-y-1">
      <h1 className="text-[1.75rem] font-bold leading-tight text-navy sm:text-[2rem]">
        {name ? `${greeting}, ${name}.` : "Welcome back."}
      </h1>
      <p className="text-base text-text-secondary">Here is what needs your attention today.</p>
    </header>
  );
}
