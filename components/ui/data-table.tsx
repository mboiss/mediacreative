import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a `<table className="data-table">` so it scrolls horizontally on small screens
 * instead of overflowing the page. Put it directly inside a <Panel padded={false}>.
 */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("table-wrap", className)}>{children}</div>;
}

/** Toolbar row above a table: search + filters, wrapping on small screens. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>{children}</div>;
}
