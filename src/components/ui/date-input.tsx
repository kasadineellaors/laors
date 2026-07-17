"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

function parseIsoDate(value: string): { month: string; day: string; year: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return { month: "", day: "", year: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function segmentsToIso(month: string, day: string, year: string): string | null {
  if (month.length !== 2 || day.length !== 2 || year.length !== 4) return null;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const iso = `${year}-${month}-${day}`;
  const check = new Date(`${iso}T12:00:00`);
  if (
    check.getFullYear() !== y ||
    check.getMonth() + 1 !== m ||
    check.getDate() !== d
  ) {
    return null;
  }
  return iso;
}

function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export interface DateInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  error?: string;
}

export function DateInput({
  id,
  name,
  value,
  onChange,
  required,
  disabled,
  className,
  wrapperClassName,
  error,
}: DateInputProps) {
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [month, setMonth] = useState(() => parseIsoDate(value).month);
  const [day, setDay] = useState(() => parseIsoDate(value).day);
  const [year, setYear] = useState(() => parseIsoDate(value).year);

  useEffect(() => {
    const parsed = parseIsoDate(value);
    setMonth(parsed.month);
    setDay(parsed.day);
    setYear(parsed.year);
  }, [value]);

  function emit(nextMonth: string, nextDay: string, nextYear: string) {
    const iso = segmentsToIso(nextMonth, nextDay, nextYear);
    if (iso) onChange(iso);
    else if (!nextMonth && !nextDay && !nextYear) onChange("");
  }

  function handleMonthChange(raw: string) {
    const next = digitsOnly(raw, 2);
    setMonth(next);
    emit(next, day, year);
    if (next.length === 2) dayRef.current?.focus();
  }

  function handleDayChange(raw: string) {
    const next = digitsOnly(raw, 2);
    setDay(next);
    emit(month, next, year);
    if (next.length === 2) yearRef.current?.focus();
  }

  function handleYearChange(raw: string) {
    const next = digitsOnly(raw, 4);
    setYear(next);
    emit(month, day, next);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    segment: "month" | "day" | "year",
  ) {
    if (e.key !== "Backspace") return;
    const target = e.currentTarget;
    if (target.selectionStart === 0 && target.selectionEnd === 0) {
      if (segment === "day") monthRef.current?.focus();
      if (segment === "year") dayRef.current?.focus();
    }
  }

  const segmentClass = cn(
    "h-11 rounded-[var(--radius-button)] border border-border-neutral bg-surface-white px-2 text-center text-base text-text-primary tabular-nums",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:border-navy",
    "disabled:cursor-not-allowed disabled:opacity-50",
    error && "border-status-critical focus-visible:ring-status-critical",
    className,
  );

  return (
    <div className={cn("w-full", wrapperClassName)}>
      <div className="flex items-center gap-2" id={id}>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          autoComplete="bday-month"
          aria-label="Month"
          placeholder="MM"
          maxLength={2}
          value={month}
          disabled={disabled}
          required={required}
          className={cn(segmentClass, "w-16")}
          onChange={(e) => handleMonthChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "month")}
        />
        <span className="text-text-secondary" aria-hidden>
          /
        </span>
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          autoComplete="bday-day"
          aria-label="Day"
          placeholder="DD"
          maxLength={2}
          value={day}
          disabled={disabled}
          required={required}
          className={cn(segmentClass, "w-16")}
          onChange={(e) => handleDayChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "day")}
        />
        <span className="text-text-secondary" aria-hidden>
          /
        </span>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          aria-label="Year"
          placeholder="YYYY"
          maxLength={4}
          value={year}
          disabled={disabled}
          required={required}
          className={cn(segmentClass, "w-24")}
          onChange={(e) => handleYearChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "year")}
        />
        {name ? <input type="hidden" name={name} value={value} /> : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
