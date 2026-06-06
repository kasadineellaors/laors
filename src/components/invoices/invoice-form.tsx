"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerOption } from "@/lib/customers/types";
import type { InvoiceLineInput, InvoiceRecord, InvoiceStatus } from "@/lib/invoices/types";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InvoiceFormProps {
  orgId: string;
  invoice?: InvoiceRecord;
  customerOptions?: CustomerOption[];
  onSuccess?: () => void;
}

type LineState = { description: string; quantity: string; unitPrice: string };

function emptyLine(): LineState {
  return { description: "", quantity: "1", unitPrice: "" };
}

export function InvoiceForm({ orgId, invoice, customerOptions = [], onSuccess }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = Boolean(invoice);

  const [customerId, setCustomerId] = useState(invoice?.customer_id ?? "");
  const [customerName, setCustomerName] = useState(invoice?.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(invoice?.customer_email ?? "");
  const [customerAddress, setCustomerAddress] = useState(invoice?.customer_address ?? "");
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoice_date ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lines, setLines] = useState<LineState[]>(
    invoice?.lines.length
      ? invoice.lines.map((l) => ({
          description: l.description,
          quantity: String(l.quantity),
          unitPrice: String(l.unit_price),
        }))
      : [emptyLine()],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCustomer = customerOptions.find((c) => c.id === customerId);

  function applyCustomer(id: string) {
    setCustomerId(id);
    const customer = customerOptions.find((c) => c.id === id);
    if (!customer) return;
    setCustomerName(customer.name);
    setCustomerEmail(customer.email ?? "");
    setCustomerAddress(customer.address ?? "");
  }

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function toLineInputs(): InvoiceLineInput[] {
    return lines.map((l) => ({
      description: l.description,
      quantity: parseFloat(l.quantity) || 1,
      unitPrice: parseFloat(l.unitPrice) || 0,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const lineInputs = toLineInputs();
    const payload = {
      customerId: customerId || undefined,
      customerName,
      customerEmail: customerEmail || undefined,
      customerAddress: customerAddress || undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      status,
      notes: notes || undefined,
      lines: lineInputs,
    };

    const result = isEdit
      ? await updateInvoice(orgId, invoice!.id, {
          customerId: customerId || null,
          customerName,
          customerEmail: customerEmail || null,
          customerAddress: customerAddress || null,
          invoiceDate,
          dueDate: dueDate || null,
          status,
          notes: notes || null,
          lines: lineInputs,
        })
      : await createInvoice(orgId, payload);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onSuccess) onSuccess();
    else if (result.invoiceId) router.push(`/invoices/${result.invoiceId}`);
    else router.push("/invoices");
    router.refresh();
  }

  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  const previewTotal = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit invoice" : "New invoice"}</CardTitle>
        <CardDescription>
          {isEdit ? invoice!.invoice_number : "Invoice number assigned on save"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {customerOptions.length > 0 ? (
          <div>
            <Label htmlFor="customerPick">Saved customer (optional)</Label>
            <select
              id="customerPick"
              value={customerId}
              onChange={(e) => applyCustomer(e.target.value)}
              className={selectClass}
            >
              <option value="">Type or pick below</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {selectedCustomer ? (
              <p className="mt-1 text-xs text-charcoal/60">
                {selectedCustomer.yardage_rate_per_head_day != null
                  ? `Yardage $${selectedCustomer.yardage_rate_per_head_day}/hd/day`
                  : "No yardage rate"}
                {" · "}
                {selectedCustomer.medicine_markup_percent != null
                  ? `${selectedCustomer.medicine_markup_percent}% medicine markup`
                  : "No medicine markup"}
              </p>
            ) : null}
          </div>
        ) : null}
        <div>
          <Label htmlFor="customer">Customer name</Label>
          <Input
            id="customer"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
              className={selectClass}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="invoiceDate">Invoice date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
              + Line
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-border p-3">
              <Input
                value={line.description}
                onChange={(e) => updateLine(index, { description: e.target.value })}
                placeholder="Description — e.g. 50 head steers"
                required={index === 0}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  placeholder="Unit $"
                />
              </div>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLines((p) => p.filter((_, i) => i !== index))}
                >
                  Remove line
                </Button>
              ) : null}
            </div>
          ))}
          <p className="text-right text-lg font-bold text-olive">
            Total: {previewTotal.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          </p>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save invoice" : "Create invoice"}
        </Button>
      </form>
    </Card>
  );
}
