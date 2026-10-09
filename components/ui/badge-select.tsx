"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneClasses, toneForStatus, type Tone } from "@/components/ui/status-badge";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-neutral",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  accent: "text-accent",
  purple: "text-purple",
};

type BadgeSelectProps<T extends string> = {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label: string;
  title?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * A native <select> that looks like a StatusBadge (tone + text), for inline status changes in tables.
 * Options use the global `select option` colours, so they read correctly in both themes.
 */
export function BadgeSelect<T extends string>({ value, options, onChange, label, title, disabled, className }: BadgeSelectProps<T>) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        title={title ?? label}
        disabled={disabled}
        className={cn(
          "cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-7 text-xs font-semibold outline-none disabled:cursor-wait disabled:opacity-60",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          toneClasses(toneForStatus(value))
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        aria-hidden
        className={cn("pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2", TONE_TEXT[toneForStatus(value)])}
      />
    </span>
  );
}
