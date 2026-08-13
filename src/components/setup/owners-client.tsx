"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerGroupMember, OwnerMiscCharge, OwnerRecord } from "@/lib/owners/types";
import { archiveOwner, createOwner, updateOwner } from "@/lib/actions/owners";
import { EMPTY_PHYSICAL_ADDRESS, formatPhysicalAddress } from "@/lib/addresses/format";
import { CustomerPortalPanel } from "@/components/setup/customer-portal-panel";
import { OwnerMiscChargesPanel } from "@/components/setup/owner-misc-charges-panel";
import { PhysicalAddressFields } from "@/components/setup/physical-address-fields";
import { SetupEditableRow } from "@/components/setup/setup-editable-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OwnersClientProps {
  orgId: string;
  owners: OwnerRecord[];
  groupMembers: Record<string, OwnerGroupMember[]>;
  miscChargesByOwner: Record<string, OwnerMiscCharge[]>;
  portalUrls: Record<string, string>;
  emailConfigured: boolean;
}

function formatRate(value: number | null) {
  if (value == null) return "";
  return String(value);
}

export function OwnersClient({
  orgId,
  owners,
  groupMembers,
  miscChargesByOwner,
  portalUrls,
  emailConfigured,
}: OwnersClientProps) {
  const router = useRouter();
  const billableOwners = useMemo(
    () => owners.filter((o) => !o.is_ownership_group),
    [owners],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState(EMPTY_PHYSICAL_ADDRESS);
  const [yardageRate, setYardageRate] = useState("");
  const [pastureRate, setPastureRate] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [feedMarkupPercent, setFeedMarkupPercent] = useState("");
  const [isOwnershipGroup, setIsOwnershipGroup] = useState(false);
  const [members, setMembers] = useState([
    { memberOwnerId: "", percentage: "50" },
    { memberOwnerId: "", percentage: "50" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createOwner(orgId, {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: formatPhysicalAddress(physicalAddress) || undefined,
      isOwnershipGroup,
      yardageRatePerHeadDay: isOwnershipGroup ? undefined : yardageRate || undefined,
      pastureRatePerHeadDay: isOwnershipGroup ? undefined : pastureRate || undefined,
      medicineMarkupPercent: isOwnershipGroup ? undefined : markupPercent || undefined,
      feedMarkupPercent: isOwnershipGroup ? undefined : feedMarkupPercent || undefined,
      members: isOwnershipGroup ? members : undefined,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setName("");
      setEmail("");
      setPhone("");
      setPhysicalAddress(EMPTY_PHYSICAL_ADDRESS);
      setYardageRate("");
      setPastureRate("");
      setMarkupPercent("");
      setFeedMarkupPercent("");
      setIsOwnershipGroup(false);
      router.refresh();
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Owners</CardTitle>
          <CardDescription>
            One place for billing contacts and lot ownership. Groups split invoices by member %.
          </CardDescription>
        </CardHeader>
        <ul className="space-y-2">
          {owners.length === 0 ? (
            <li className="text-sm text-text-secondary">None yet — add below</li>
          ) : (
            owners.map((owner) => (
              <li key={owner.id} className="space-y-2">
                <SetupEditableRow
                  badge={
                    owner.is_ownership_group
                      ? "Ownership group"
                      : owner.yardage_rate_per_head_day != null
                        ? `$${owner.yardage_rate_per_head_day}/hd/day`
                        : owner.email ?? undefined
                  }
                  fields={[
                    { key: "name", label: "Name", value: owner.name },
                    { key: "email", label: "Email", value: owner.email ?? "" },
                    { key: "phone", label: "Phone", value: owner.phone ?? "" },
                    {
                      key: "address",
                      label: "Physical address",
                      value: owner.address ?? "",
                      type: "address",
                    },
                    ...(owner.is_ownership_group
                      ? []
                      : [
                          {
                            key: "yardageRate",
                            label: "Yardage ($/head/day)",
                            value: formatRate(owner.yardage_rate_per_head_day),
                            placeholder: "0.75",
                          },
                          {
                            key: "pastureRate",
                            label: "Pasture ($/head/day)",
                            value: formatRate(owner.pasture_rate_per_head_day),
                            placeholder: "0.50",
                          },
                          {
                            key: "markupPercent",
                            label: "Medicine markup (%)",
                            value: formatRate(owner.medicine_markup_percent),
                            placeholder: "15",
                          },
                          {
                            key: "feedMarkupPercent",
                            label: "Feed markup (%)",
                            value: formatRate(owner.feed_markup_percent),
                            placeholder: "10",
                          },
                        ]),
                    { key: "notes", label: "Notes", value: owner.notes ?? "" },
                  ]}
                  onSave={async (values) => {
                    const result = await updateOwner(orgId, owner.id, {
                      name: values.name,
                      email: values.email || undefined,
                      phone: values.phone || undefined,
                      address: values.address || undefined,
                      yardageRatePerHeadDay: values.yardageRate ?? undefined,
                      pastureRatePerHeadDay: values.pastureRate ?? undefined,
                      medicineMarkupPercent: values.markupPercent ?? undefined,
                      feedMarkupPercent: values.feedMarkupPercent ?? undefined,
                      notes: values.notes || undefined,
                    });
                    if (!result.error) router.refresh();
                    return result;
                  }}
                  onArchive={async () => {
                    const result = await archiveOwner(orgId, owner.id);
                    if (!result.error) router.refresh();
                    return result;
                  }}
                />
                {owner.is_ownership_group && (groupMembers[owner.id]?.length ?? 0) > 0 ? (
                  <p className="px-1 text-xs text-text-secondary">
                    Members:{" "}
                    {groupMembers[owner.id]
                      .map((m) => `${m.member_name} (${m.percentage}%)`)
                      .join(" · ")}
                  </p>
                ) : null}
                {!owner.is_ownership_group ? (
                  <>
                    <CustomerPortalPanel
                      orgId={orgId}
                      customerId={owner.id}
                      customerName={owner.name}
                      customerEmail={owner.email}
                      initialPortalUrl={portalUrls[owner.id] ?? null}
                      emailConfigured={emailConfigured}
                    />
                    <OwnerMiscChargesPanel
                      orgId={orgId}
                      ownerId={owner.id}
                      ownerName={owner.name}
                      charges={miscChargesByOwner[owner.id] ?? []}
                    />
                  </>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add owner</CardTitle>
          <CardDescription>Individual owners get billed. Groups split invoices to members.</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input
              type="checkbox"
              checked={isOwnershipGroup}
              onChange={(e) => setIsOwnershipGroup(e.target.checked)}
            />
            Ownership group (split billing to co-owners)
          </label>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {!isOwnershipGroup ? (
            <div className="space-y-3 rounded-lg border border-border-neutral bg-tan/10 p-4">
              <p className="text-sm font-medium text-navy">Contact & mailing address</p>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-navy">Physical address</p>
                <PhysicalAddressFields
                  idPrefix="owner-address"
                  value={physicalAddress}
                  onChange={setPhysicalAddress}
                />
              </div>
            </div>
          ) : null}
          {!isOwnershipGroup ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="yardage">Yardage ($/head/day)</Label>
                  <Input id="yardage" type="number" min={0} step="0.0001" value={yardageRate} onChange={(e) => setYardageRate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pasture">Pasture ($/head/day)</Label>
                  <Input id="pasture" type="number" min={0} step="0.0001" value={pastureRate} onChange={(e) => setPastureRate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="markup">Medicine markup (%)</Label>
                  <Input id="markup" type="number" min={0} step="0.01" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="feedMarkup">Feed markup (%)</Label>
                  <Input id="feedMarkup" type="number" min={0} step="0.01" value={feedMarkupPercent} onChange={(e) => setFeedMarkupPercent(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2 rounded-lg border border-border-neutral p-3">
              <p className="text-sm font-medium text-navy">Co-owners & split %</p>
              {members.map((member, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px] gap-2">
                  <select
                    value={member.memberOwnerId}
                    onChange={(e) => {
                      const next = [...members];
                      next[index] = { ...next[index], memberOwnerId: e.target.value };
                      setMembers(next);
                    }}
                    className="flex h-10 w-full rounded-lg border-2 border-border-neutral bg-surface-white px-3 text-sm"
                  >
                    <option value="">Select owner</option>
                    {billableOwners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={member.percentage}
                    onChange={(e) => {
                      const next = [...members];
                      next[index] = { ...next[index], percentage: e.target.value };
                      setMembers(next);
                    }}
                    placeholder="%"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMembers([...members, { memberOwnerId: "", percentage: "" }])}
              >
                Add member
              </Button>
            </div>
          )}
          {error ? (
            <p className="text-sm text-status-critical" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Adding…" : "Add owner"}
          </Button>
        </form>
      </Card>
    </>
  );
}
