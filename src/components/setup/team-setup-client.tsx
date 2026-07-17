"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SystemRole } from "@/types/database";
import { inviteTeamMember } from "@/lib/actions/onboarding";
import { updateTeamMember } from "@/lib/actions/team";
import {
  INVITE_ROLE_OPTIONS,
  ROLE_MODULE_PRESETS,
  resolveVisibleModules,
  type AppModuleId,
} from "@/lib/auth/modules";
import { SYSTEM_ROLE_LABELS } from "@/lib/permissions/roles";
import { ModuleAccessPicker } from "@/components/setup/module-access-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamMemberRow {
  id: string;
  name: string;
  role: SystemRole;
  visibleModules: string[] | null;
}

interface PendingInviteRow {
  email: string;
  role: string;
  visible_modules?: string[] | null;
}

interface TeamSetupClientProps {
  orgId: string;
  inviterIsOwner: boolean;
  pendingInvites: PendingInviteRow[];
  members: TeamMemberRow[];
  emailConfigured: boolean;
  emailSetupMessage: string;
}

const selectClass =
  "flex h-12 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-4 text-base";

function formatAccessSummary(role: SystemRole, visibleModules: string[] | null) {
  const modules = resolveVisibleModules(role, visibleModules);
  if (modules.length >= 8) return "Full app access";
  return `${modules.length} areas`;
}

export function TeamSetupClient({
  orgId,
  inviterIsOwner,
  pendingInvites,
  members,
  emailConfigured,
  emailSetupMessage,
}: TeamSetupClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SystemRole>("worker");
  const [inviteModules, setInviteModules] = useState<AppModuleId[]>(
    ROLE_MODULE_PRESETS.worker,
  );
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<SystemRole>("worker");
  const [editModules, setEditModules] = useState<AppModuleId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviterIsOwner) return;
    setInviteModules([...ROLE_MODULE_PRESETS[role]]);
  }, [role, inviterIsOwner]);

  function startEditMember(member: TeamMemberRow) {
    setEditingMemberId(member.id);
    setEditRole(member.role);
    setEditModules(resolveVisibleModules(member.role, member.visibleModules));
    setError(null);
  }

  function cancelEdit() {
    setEditingMemberId(null);
    setError(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviterIsOwner && inviteModules.length === 0) {
      setError("Select at least one area for this person to see");
      return;
    }
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("orgId", orgId);
    fd.set("email", email);
    fd.set("role", role);
    if (inviterIsOwner) {
      fd.set("visibleModules", JSON.stringify(inviteModules));
    }
    const result = await inviteTeamMember({}, fd);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setEmail("");
      setRole("worker");
      setInviteModules([...ROLE_MODULE_PRESETS.worker]);
      router.refresh();
    }
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMemberId) return;
    if (editModules.length === 0) {
      setError("Select at least one area for this person to see");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updateTeamMember(orgId, editingMemberId, {
      systemRole: editRole,
      visibleModules: editModules,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      cancelEdit();
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {!emailConfigured ? (
        <div className="rounded-[var(--radius-card)] border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {emailSetupMessage ||
            "Email is not configured. Add RESEND_API_KEY, INVOICE_FROM_EMAIL, and SUPABASE_SERVICE_ROLE_KEY to send invites."}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Team members</CardTitle>
          <CardDescription>People with access to this ranch</CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {members.length === 0 ? (
            <li className="text-sm text-text-secondary">Just you for now</li>
          ) : (
            members.map((m) => (
              <li key={m.id}>
                {editingMemberId === m.id && inviterIsOwner && m.role !== "owner" ? (
                  <form
                    onSubmit={handleSaveMember}
                    className="space-y-4 rounded-lg border border-border-neutral p-3"
                  >
                    <p className="text-sm font-semibold text-navy">Edit access — {m.name}</p>
                    <div>
                      <Label htmlFor="editRole">Role</Label>
                      <select
                        id="editRole"
                        value={editRole}
                        onChange={(e) => {
                          const nextRole = e.target.value as SystemRole;
                          setEditRole(nextRole);
                          setEditModules([...ROLE_MODULE_PRESETS[nextRole]]);
                        }}
                        className={selectClass}
                      >
                        {INVITE_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ModuleAccessPicker
                      role={editRole}
                      selected={editModules}
                      onChange={setEditModules}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving…" : "Save changes"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={cancelEdit} disabled={loading}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border-neutral px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-navy">{m.name}</span>
                      <span className="mt-0.5 block text-xs text-text-secondary">
                        {SYSTEM_ROLE_LABELS[m.role]} · {formatAccessSummary(m.role, m.visibleModules)}
                      </span>
                    </div>
                    {inviterIsOwner && m.role !== "owner" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditMember(m)}
                        disabled={loading}
                      >
                        Edit access
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </Card>

      {pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
          </CardHeader>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => (
              <li
                key={inv.email}
                className="flex justify-between rounded-lg bg-cream px-3 py-2 text-sm text-navy"
              >
                <span>{inv.email}</span>
                <span className="text-text-secondary">
                  {SYSTEM_ROLE_LABELS[inv.role as SystemRole] ?? inv.role}
                  {inv.visible_modules?.length
                    ? ` · ${inv.visible_modules.length} areas`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Invite someone</CardTitle>
          <CardDescription>
            {inviterIsOwner
              ? "Pick their role and choose what parts of the app they can see."
              : "Workers can log time, treatments, and sales. Owners customize access per person."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hand@ranch.com"
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as SystemRole)}
              className={selectClass}
            >
              {INVITE_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-secondary">
              {INVITE_ROLE_OPTIONS.find((o) => o.value === role)?.description}
            </p>
          </div>
          {inviterIsOwner ? (
            <ModuleAccessPicker
              role={role}
              selected={inviteModules}
              onChange={setInviteModules}
            />
          ) : (
            <p className="rounded-lg bg-cream/40 px-3 py-2 text-xs text-text-secondary">
              They will see the default areas for a {SYSTEM_ROLE_LABELS[role].toLowerCase()}:{" "}
              {formatAccessSummary(role, null)}.
            </p>
          )}
          {error ? (
            <p className="text-sm text-status-critical" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
