import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Label + control + hint/error, stacked. Wrap every form control in one. */
export function Field({ label, htmlFor, required, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("form-input", className)} {...props} />;
}

export function SelectInput({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("form-input form-select", className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn("form-input min-h-24 resize-y", className)} {...props} />;
}

/** Search box with a leading icon slot. */
export function SearchInput({ icon, className, ...props }: ComponentProps<"input"> & { icon?: ReactNode }) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">{icon}</span>}
      <input type="search" className={cn("form-input", icon && "pl-9")} {...props} />
    </div>
  );
}
