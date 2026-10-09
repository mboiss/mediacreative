import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneClasses, type Tone } from "@/components/ui/status-badge";

// Hover border picks up the card's own tone so each KPI "lights up" in its colour.
const HOVER_BORDER: Record<Tone, string> = {
  neutral: "hover:border-neutral-border",
  info: "hover:border-info-border",
  success: "hover:border-success-border",
  warning: "hover:border-warning-border",
  danger: "hover:border-danger-border",
  accent: "hover:border-accent-border",
  purple: "hover:border-purple-border",
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  /** Small line under the value, e.g. "5 invoices". */
  hint?: ReactNode;
  href?: string;
  loading?: boolean;
};

export function StatCard({ label, value, icon, tone = "accent", hint, href, loading }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "group/stat flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5",
        "transition duration-200 ease-out hover:bg-surface-hover hover:shadow-pop motion-safe:hover:-translate-y-0.5",
        HOVER_BORDER[tone]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {icon && (
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border transition-transform duration-200 motion-safe:group-hover/stat:scale-110",
              toneClasses(tone)
            )}
          >
            {icon}
          </div>
        )}
        {href && (
          <ArrowRight
            className="size-4 text-fg-subtle transition duration-200 group-hover/stat:text-fg motion-safe:group-hover/stat:translate-x-0.5"
            aria-hidden
          />
        )}
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</div>
        <div className="mt-1 text-2xl font-bold text-fg">
          {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded-md bg-surface-hover" /> : value}
        </div>
        {hint && !loading && <div className="mt-1 text-xs text-fg-subtle">{hint}</div>}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-card focus-visible:outline-2 focus-visible:outline-accent">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Responsive grid for StatCards: 2 columns on phones and tablets, 4 on desktop. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>{children}</div>;
}
