# Media Creative Control Center — Design Guide

Dark-first "glass" look with the cyan → purple brand accent. Both **dark** and **light** themes must look right,
and every page must work from **375px phones to wide desktops**.

## Rules

1. **Colours only from tokens.** Never write hex/rgb colours in components. Use the Tailwind token utilities
   (below) or `var(--token)`. The only exceptions are the printable invoice paper (always white) and brand logos.
2. **Tailwind classes, not inline `style={{}}`.** Inline styles cannot be responsive or themed. Keep inline style
   only for truly dynamic values (e.g. a computed width %).
3. **Minimum text size 12px** (`text-xs`). Body text `text-sm`; table cells `text-sm`; labels `text-xs uppercase tracking-wide`.
4. **Status = tone + text**, never colour alone. Use `<StatusBadge status="Paid" />`.
5. **Every icon-only button needs `aria-label`** (and a `title` for a tooltip).
6. **Responsive by default:** grids collapse (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), toolbars wrap
   (`flex-wrap`), tables scroll inside `<TableWrap>`, action groups wrap. No fixed pixel widths on containers.
7. **Feedback:** toasts via `useToast()`, confirmations via `useConfirm()`, loading via `<LoadingState />`,
   empty lists via `<EmptyState />`, long lists via `usePagination` + `<Pagination />`. Never `alert`/`confirm`.

## Tokens → Tailwind utilities (defined in `app/globals.css`)

| Purpose | Utility |
|---|---|
| Page background | `bg-page` |
| Card surface / hover | `bg-surface`, `hover:bg-surface-hover` |
| Solid panel (dropdowns) | `bg-panel` |
| Inputs / nested blocks | `bg-inset` |
| Modal | `bg-elevated` |
| Text | `text-fg` (primary), `text-fg-muted` (secondary), `text-fg-subtle` (hints) |
| Borders | `border-line`, `border-line-strong`, `border-line-accent` |
| Brand | `text-accent`, `bg-accent-bg`, `border-accent-border`, `text-purple`, `bg-purple-bg` |
| Status | `text-success / bg-success-bg / border-success-border` — same for `warning`, `danger`, `info`, `neutral` |
| Radius | `rounded-card` (cards), `rounded-control` (inputs/buttons), `rounded-xl`, `rounded-full` |
| Shadow | `shadow-card` |

Charts (recharts) take colours as props: use `var(--accent-cyan)`, `var(--success)`, `var(--warning)`, `var(--danger)`,
`var(--info)`, `var(--accent-purple)`, `var(--text-muted)`, `var(--border)`; tooltip background `var(--tooltip-bg)`.

## Components (`components/ui/`)

- `PageHeader` — title, description, meta badge, actions (wrap on mobile). One per page.
- `Panel` — the standard card. `padded={false}` for tables. Optional `title`, `description`, `icon`, `actions`.
- `StatCard` + `StatGrid` — KPI tiles (tone: accent | success | warning | danger | info | purple | neutral).
- `StatusBadge` — `status` auto-maps to a tone (Paid, Sent, Draft, Overdue, Running, Upcoming, Finish, Cancel,
  Pending, Unpaid, Available, Rented, Maintenance, Active, Expired); or pass `tone` explicitly.
- `Field`, `TextInput`, `SelectInput`, `TextArea`, `SearchInput` — form controls.
- `TableWrap`, `FilterBar` — table scroll container and filter toolbar.
- `Modal`, `useConfirm`, `useToast`, `Pagination`/`usePagination`, `LoadingState`, `EmptyState`.
- Buttons: `className="btn btn-primary | btn-ghost | btn-danger | btn-success"`, add `btn-sm` or `btn-icon`.

## Page skeleton

```tsx
<div className="flex flex-col gap-6">
  <PageHeader title="Clients" description="39 clients" actions={<button className="btn btn-primary">…</button>} />
  <StatGrid>…<StatCard … /></StatGrid>
  <Panel padded={false}>
    <div className="border-b border-line p-4"><FilterBar><SearchInput … /> <SelectInput …/></FilterBar></div>
    <TableWrap><table className="data-table">…</table></TableWrap>
    <Pagination … />
  </Panel>
</div>
```

## Language

UI text is English. Keep labels short and consistent: "Save", "Cancel", "Delete", "Edit", "New …".
