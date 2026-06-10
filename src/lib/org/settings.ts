import type { Organization } from "@/types/database";

export type OrgSettings = {
  calendar_enabled?: boolean;
  pending_invites?: Array<{ email: string; role: string }>;
};

export function getOrgSettings(org: Organization | null | undefined): OrgSettings {
  if (!org?.settings || typeof org.settings !== "object" || Array.isArray(org.settings)) {
    return {};
  }
  return org.settings as OrgSettings;
}

/** Calendar is on by default until a manager turns it off. */
export function isCalendarEnabled(org: Organization | null | undefined): boolean {
  const settings = getOrgSettings(org);
  return settings.calendar_enabled !== false;
}
