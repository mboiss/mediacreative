import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Badge or count shown next to the title. */
  meta?: ReactNode;
  /** Buttons on the right; they wrap below the title on small screens. */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("animate-fade-in-up flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
