import type { SystemRole } from "@/types/database";

/** App areas an owner can grant on invite — maps to bottom nav and manage sections. */
export const APP_MODULE_DEFS = [
  { id: "dashboard", label: "Home", description: "Dashboard and getting started" },
  { id: "cattle", label: "Cattle", description: "Lots, herds, moves, and inventory" },
  { id: "feed", label: "Feed", description: "Rations, inventory, and feeding logs" },
  { id: "health", label: "Health", description: "Treatments and medicine" },
  { id: "jobs", label: "Jobs", description: "Tasks and work orders" },
  { id: "calendar", label: "Calendar", description: "Ranch calendar" },
  { id: "time", label: "Time clock", description: "Clock in/out and team time" },
  { id: "sales", label: "Sales", description: "Record cattle and animal sales" },
  { id: "invoices", label: "Invoices", description: "Billing and customer invoices" },
  { id: "reports", label: "Reports", description: "P&L and ranch reports" },
  { id: "setup", label: "Ranch setup", description: "Locations, team, preferences" },
  { id: "weather", label: "Rainfall", description: "Rainfall and weather logs" },
] as const;

export type AppModuleId = (typeof APP_MODULE_DEFS)[number]["id"];

export const ALL_MODULE_IDS: AppModuleId[] = APP_MODULE_DEFS.map((m) => m.id);

const MODULE_ID_SET = new Set<string>(ALL_MODULE_IDS);

export function isAppModuleId(value: string): value is AppModuleId {
  return MODULE_ID_SET.has(value);
}

export function sanitizeModuleIds(values: string[] | null | undefined): AppModuleId[] {
  if (!values?.length) return [];
  return values.filter(isAppModuleId);
}

/** Default visibility when no custom list is saved on the member row. */
export const ROLE_MODULE_PRESETS: Record<SystemRole, AppModuleId[]> = {
  owner: ALL_MODULE_IDS,
  manager: ALL_MODULE_IDS,
  worker: ["dashboard", "cattle", "feed", "health", "jobs", "time"],
  accountant: ["dashboard", "time", "sales", "invoices", "reports"],
  veterinarian: ["dashboard", "cattle", "health"],
  viewer: ["dashboard", "cattle", "feed", "health", "jobs"],
  stocker_owner: ["dashboard", "cattle", "feed", "sales", "reports"],
};

export function resolveVisibleModules(
  role: SystemRole,
  visibleModules: string[] | null | undefined,
): AppModuleId[] {
  if (role === "owner") return ALL_MODULE_IDS;
  const custom = sanitizeModuleIds(visibleModules);
  if (custom.length > 0) return custom;
  return ROLE_MODULE_PRESETS[role] ?? ROLE_MODULE_PRESETS.worker;
}

export function pathToModule(pathname: string): AppModuleId | null {
  if (pathname === "/dashboard" || pathname === "/") return "dashboard";
  if (
    pathname.startsWith("/cattle") ||
    pathname.startsWith("/cow-calf") ||
    pathname.startsWith("/seedstock")
  ) {
    return "cattle";
  }
  if (pathname.startsWith("/feed")) return "feed";
  if (pathname.startsWith("/health")) return "health";
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/time")) return "time";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/invoices")) return "invoices";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/setup")) return "setup";
  if (pathname.startsWith("/weather")) return "weather";
  return null;
}

export function canAccessPath(pathname: string, modules: AppModuleId[]): boolean {
  const module = pathToModule(pathname);
  if (!module) return true;
  return modules.includes(module);
}

export function navKeyVisible(
  navKey: string,
  modules: AppModuleId[],
  calendarEnabled: boolean,
): boolean {
  switch (navKey) {
    case "home":
      return modules.includes("dashboard");
    case "cattle":
      return modules.includes("cattle");
    case "feed":
      return modules.includes("feed");
    case "health":
      return modules.includes("health");
    case "jobs":
      return modules.includes("jobs");
    case "calendar":
      return calendarEnabled && modules.includes("calendar");
    case "manage":
      return (
        modules.includes("setup") ||
        modules.includes("sales") ||
        modules.includes("invoices") ||
        modules.includes("reports") ||
        modules.includes("time") ||
        modules.includes("weather")
      );
    default:
      return true;
  }
}

export const INVITE_ROLE_OPTIONS: Array<{
  value: SystemRole;
  label: string;
  description: string;
}> = [
  {
    value: "worker",
    label: "Worker",
    description: "Log field work, time, treatments, and sales",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Full ranch operations except billing setup",
  },
  {
    value: "accountant",
    label: "Accountant",
    description: "Invoices, sales, reports, and team time",
  },
  {
    value: "veterinarian",
    label: "Veterinarian",
    description: "Cattle and health records",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only access to daily ranch data",
  },
];
