"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LotExpenseRecord } from "@/lib/expenses/types";
import type { SelectOption } from "@/lib/locations/options";
import {
  archiveLotExpense,
  createLotExpense,
  updateLotExpense,
} from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

interface LotExpensesPanelProps {
  orgId: string;
  groupId: string;
  expenses: LotExpenseRecord[];
  categoryOptions: SelectOption[];
  canManage: boolean;
}

export function LotExpensesPanel({
  orgId,
  groupId,
  expenses,
  categoryOptions,
  canManage,
}: LotExpensesPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categoryOptions[0]?.value ?? "");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const selectClass =
    "flex h-12 w-full rounded-lg border-2 border-border bg-surface px-4 text-base";

  function resetForm() {
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setCategoryId(categoryOptions[0]?.value ?? "");
    setDescription("");
    setVendorName("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(expense: LotExpenseRecord) {
    setEditingId(expense.id);
    setShowForm(false);
    setExpenseDate(expense.expense_date);
    setAmount(String(expense.amount));
    setCategoryId(expense.financial_category_id ?? "");
    setDescription(expense.description ?? "");
    setVendorName(expense.vendor_name ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError(null);

    const payload = {
      expenseDate,
      amount: parsed,
      financialCategoryId: categoryId || null,
      description: description || null,
      vendorName: vendorName || null,
    };

    const result = editingId
      ? await updateLotExpense(orgId, editingId, groupId, payload)
      : await createLotExpense(orgId, groupId, {
          ...payload,
          financialCategoryId: categoryId || undefined,
          description: description || undefined,
          vendorName: vendorName || undefined,
        });

    setLoading(false);
    if (result.error) setError(result.error);
    else {
      resetForm();
      router.refresh();
    }
  }

  async function handleArchive(expenseId: string) {
    if (!window.confirm("Remove this expense?")) return;
    setLoading(true);
    setError(null);
    const result = await archiveLotExpense(orgId, expenseId, groupId);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      if (editingId === expenseId) resetForm();
      router.refresh();
    }
  }

  const showExpenseForm = showForm || editingId != null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Other expenses</CardTitle>
            <CardDescription>
              Freight, labor, commission, and misc costs tied to this lot.
            </CardDescription>
          </div>
          <p className="text-lg font-bold tabular-nums text-charcoal">{money(total)}</p>
        </div>
      </CardHeader>
      <div className="space-y-3 px-4 pb-4">
        {canManage ? (
          <Button
            type="button"
            variant={showForm ? "primary" : "secondary"}
            onClick={() => {
              if (showForm) resetForm();
              else {
                setEditingId(null);
                setShowForm(true);
              }
            }}
            disabled={loading}
          >
            {showForm ? "Cancel" : "Log expense"}
          </Button>
        ) : null}

        {showExpenseForm ? (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-charcoal">
              {editingId ? "Edit expense" : "New expense"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expDate">Date</Label>
                <Input
                  id="expDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expAmount">Amount ($)</Label>
                <Input
                  id="expAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            {categoryOptions.length > 0 ? (
              <div>
                <Label htmlFor="expCat">Category</Label>
                <select
                  id="expCat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Uncategorized</option>
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="expDesc">Description</Label>
              <Input
                id="expDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hauling, commission, etc."
              />
            </div>
            <div>
              <Label htmlFor="expVendor">Vendor</Label>
              <Input
                id="expVendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Saving…" : editingId ? "Save changes" : "Save expense"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  disabled={loading}
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}

        {expenses.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p className="font-medium text-charcoal">
                    {e.expense_date}
                    {e.category_name ? ` · ${e.category_name}` : ""}
                  </p>
                  <p className="text-charcoal/70">
                    {[e.description, e.vendor_name].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{money(e.amount)}</span>
                  {canManage ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-olive hover:underline"
                        onClick={() => startEdit(e)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-rust hover:underline"
                        onClick={() => handleArchive(e.id)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-charcoal/60">No misc expenses logged yet.</p>
        )}

        {error ? (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
