import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Phone layout for list pages: render tables as `hidden md:block` and a <MobileList> of
 * <ListCard>s as `md:hidden`, so each row is readable without scrolling sideways.
 */
export function MobileList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn("divide-y divide-line md:hidden", className)}>{children}</ul>;
}

type ListCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned primary value, e.g. an amount. */
  value?: ReactNode;
  /** Badges / small facts shown under the title. */
  meta?: ReactNode;
  /** Usually a <RowActions>. */
  actions?: ReactNode;
  /** Makes the card body a link (actions stay separately clickable). */
  href?: string;
  className?: string;
};

export function ListCard({ title, subtitle, value, meta, actions, href, className }: ListCardProps) {
  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-fg">{title}</div>
          {subtitle && <div className="truncate text-xs text-fg-subtle">{subtitle}</div>}
        </div>
        {value && <div className="shrink-0 text-right font-semibold tabular-nums text-fg">{value}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">{meta}</div>}
    </div>
  );

  return (
    <li className={cn("flex items-start gap-2 px-4 py-3", className)}>
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-accent">
          {body}
        </Link>
      ) : (
        body
      )}
      {actions && <div className="-mr-1 shrink-0">{actions}</div>}
    </li>
  );
}
