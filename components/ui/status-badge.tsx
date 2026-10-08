import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent" | "purple";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-neutral-bg text-neutral border-neutral-border",
  info: "bg-info-bg text-info border-info-border",
  success: "bg-success-bg text-success border-success-border",
  warning: "bg-warning-bg text-warning border-warning-border",
  danger: "bg-danger-bg text-danger border-danger-border",
  accent: "bg-accent-bg text-accent border-accent-border",
  purple: "bg-purple-bg text-purple border-purple-border",
};

/** Maps every status value used in the app to a tone, so the same status always looks the same. */
const STATUS_TONES: Record<string, Tone> = {
  // invoices
  Draft: "neutral",
  Sent: "info",
  Paid: "success",
  Overdue: "danger",
  Cancelled: "danger",
  // tours
  Upcoming: "info",
  Running: "success",
  Finish: "neutral",
  Cancel: "danger",
  // tour invoice status
  Pending: "warning",
  Unpaid: "danger",
  // modems / eSIM
  Available: "success",
  Rented: "accent",
  Maintenance: "warning",
  Active: "success",
  Expired: "neutral",
};

export function toneForStatus(status: string | null | undefined): Tone {
  return (status && STATUS_TONES[status]) || "neutral";
}

type StatusBadgeProps = {
  /** Status text; its tone is looked up automatically unless `tone` is given. */
  status?: string | null;
  tone?: Tone;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function StatusBadge({ status, tone, children, icon, className }: StatusBadgeProps) {
  const resolved = tone ?? toneForStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[resolved],
        className
      )}
    >
      {icon ?? <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children ?? status}
    </span>
  );
}

export function toneClasses(tone: Tone) {
  return TONE_CLASSES[tone];
}
