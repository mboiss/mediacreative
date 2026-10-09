"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: ReactNode;
  /** Either navigate… */
  href?: string;
  /** …or run a handler. */
  onSelect?: () => void;
  /** Destructive actions are shown last, in red, after a separator. */
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

const itemClass =
  "flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle";

/**
 * The "⋯" menu for table rows and list cards. Rendered in a portal, so it is never clipped by
 * scrolling table containers. Keeps rows clean: one button instead of a row of Edit/Delete buttons.
 */
export function RowActions({ actions, label = "Row actions", className }: { actions: RowAction[]; label?: string; className?: string }) {
  const visible = actions.filter((a) => !a.hidden);
  const normal = visible.filter((a) => !a.danger);
  const danger = visible.filter((a) => a.danger);

  const renderItem = (action: RowAction) => (
    <DropdownMenu.Item
      key={action.label}
      disabled={action.disabled}
      asChild={!!action.href}
      onSelect={action.href ? undefined : () => action.onSelect?.()}
      className={cn(itemClass, action.danger && "text-danger [&_svg]:text-danger data-[highlighted]:bg-danger-bg")}
    >
      {action.href ? (
        <Link href={action.href}>
          {action.icon}
          {action.label}
        </Link>
      ) : (
        <>
          {action.icon}
          {action.label}
        </>
      )}
    </DropdownMenu.Item>
  );

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-control text-fg-muted outline-none transition hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent data-[state=open]:bg-surface-hover data-[state=open]:text-fg",
          className
        )}
      >
        <MoreHorizontal size={18} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="z-[200] min-w-44 rounded-control border border-line bg-panel p-1 shadow-pop"
        >
          {normal.map(renderItem)}
          {normal.length > 0 && danger.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-line" />}
          {danger.map(renderItem)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
