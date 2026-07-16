"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SearchResponse } from "@/lib/search/types";

const KIND_LABELS = {
  lot: "Lots",
  sale: "Sales",
  feeding: "Feedings",
} as const;

interface GlobalSearchProps {
  orgId: string;
}

export function GlobalSearch({ orgId }: GlobalSearchProps) {
  const inputId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);

  const runSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < 2) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({ orgId, q: trimmed });
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) {
          setData(null);
          return;
        }
        const json = (await res.json()) as SearchResponse;
        setData(json);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [orgId],
  );

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [open, query, runSearch]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setData(null);
      setLoading(false);
    }
  }, [open]);

  const grouped = data
    ? (["lot", "sale", "feeding"] as const)
        .map((kind) => ({
          kind,
          label: KIND_LABELS[kind],
          items: data.results.filter((item) => item.kind === kind),
        }))
        .filter((group) => group.items.length > 0)
    : [];

  return (
    <div ref={panelRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={inputId}
      >
        Search
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3 shadow-lg">
          <label htmlFor={inputId} className="sr-only">
            Search lots, sales, and feedings
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lots, sales, feedings…"
            autoComplete="off"
          />

          <div className="mt-3 max-h-80 overflow-y-auto text-sm">
            {query.trim().length < 2 ? (
              <p className="px-1 text-charcoal/60">Type at least 2 characters.</p>
            ) : loading ? (
              <p className="px-1 text-charcoal/60">Searching…</p>
            ) : grouped.length === 0 ? (
              <p className="px-1 text-charcoal/60">No matches for &ldquo;{query.trim()}&rdquo;.</p>
            ) : (
              <div className="space-y-4">
                {grouped.map((group) => (
                  <section key={group.kind}>
                    <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-charcoal/50">
                      {group.label}
                    </h3>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {group.items.map((item) => (
                        <li key={`${item.kind}-${item.id}`}>
                          <Link
                            href={item.href}
                            className="block px-3 py-2 hover:bg-olive/5"
                            onClick={() => setOpen(false)}
                          >
                            <p className="font-semibold text-charcoal">{item.title}</p>
                            <p className="text-xs text-charcoal/60">{item.subtitle}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
