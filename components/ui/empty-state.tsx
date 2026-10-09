import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center sm:py-14">
      {icon && (
        <div className="flex size-16 items-center justify-center rounded-card border border-accent-border bg-accent-bg text-accent">
          {icon}
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
