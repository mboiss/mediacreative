import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Controls shown on the right of the header. */
  actions?: ReactNode;
  /** Set false for full-bleed content such as tables. */
  padded?: boolean;
  className?: string;
  bodyClassName?: string;
};

/** The standard card surface. Use it for every boxed section instead of hand-styled divs. */
export function Panel({ children, title, description, icon, actions, padded = true, className, bodyClassName }: PanelProps) {
  const hasHeader = title || actions;
  return (
    <section className={cn("overflow-hidden rounded-card border border-line bg-surface shadow-card", className)}>
      {hasHeader && (
        <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6", !padded && "pb-4")}>
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
                {icon && <span className="text-accent">{icon}</span>}
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && (hasHeader ? "px-5 pb-5 pt-4 sm:px-6" : "p-5 sm:p-6"), bodyClassName)}>{children}</div>
    </section>
  );
}
