"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Building, Check, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickerClient = {
  id: string;
  full_name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
};

const MAX_RESULTS = 8;

/**
 * Type-to-search client combobox: suggestions appear as you type, pick one with a click
 * or ↑/↓ + Enter. Once chosen, the client is shown as a card with a "Change" button.
 */
export function ClientPicker({
  clients,
  value,
  onChange,
  onCreateNew,
}: {
  clients: PickerClient[];
  value: string;
  onChange: (id: string) => void;
  onCreateNew?: (prefillName: string) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(!value);

  const selected = clients.find((c) => c.id === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? clients.filter((c) =>
          [c.full_name, c.company, c.email, c.phone].some((v) => v?.toLowerCase().includes(q))
        )
      : clients;
    return list.slice(0, MAX_RESULTS);
  }, [clients, query]);

  // A client chosen from outside (e.g. preselected via ?client=, or just created) shows as the card.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value) setEditing(false);
  }, [value]);

  // Close the suggestion list when clicking outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      choose(matches[active].id);
    } else if (e.key === "Escape") {
      setOpen(false);
      if (selected) setEditing(false);
    }
  }

  if (selected && !editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-inset px-4 py-3">
        <div className="min-w-0 text-sm">
          <div className="flex items-center gap-1.5 font-semibold text-fg">
            <Check size={14} className="shrink-0 text-success" aria-hidden />
            <span className="truncate">{selected.company || selected.full_name}</span>
          </div>
          {selected.company && <div className="truncate text-fg-muted">Attn. {selected.full_name}</div>}
          {(selected.email || selected.phone) && (
            <div className="truncate text-xs text-fg-subtle">{[selected.phone, selected.email].filter(Boolean).join(" · ")}</div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm shrink-0"
          onClick={() => {
            setEditing(true);
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].id}` : undefined}
          aria-label="Search client"
          className="form-input pl-9 pr-9"
          placeholder="Type a client or company name…"
          value={query}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {selected && (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-hover hover:text-fg"
            aria-label="Keep current client"
            title="Keep current client"
            onClick={() => {
              setEditing(false);
              setOpen(false);
              setQuery("");
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-control border border-line bg-panel shadow-pop">
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <li className="px-3 py-3 text-sm text-fg-muted">No clients match “{query}”.</li>
            ) : (
              matches.map((c, i) => (
                <li
                  key={c.id}
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={c.id === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(c.id)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                    i === active ? "bg-surface-hover" : ""
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-bg text-xs font-semibold text-accent">
                    {(c.company || c.full_name).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-fg">{c.full_name}</div>
                    {(c.company || c.email) && (
                      <div className="flex items-center gap-1 truncate text-xs text-fg-subtle">
                        {c.company && <Building size={11} aria-hidden className="shrink-0" />}
                        <span className="truncate">{c.company || c.email}</span>
                      </div>
                    )}
                  </div>
                  {c.id === value && <Check size={14} className="shrink-0 text-success" aria-hidden />}
                </li>
              ))
            )}
          </ul>
          {onCreateNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                onCreateNew(query.trim());
              }}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-surface-hover"
            >
              <Plus size={14} aria-hidden />
              {query.trim() ? `Create new client “${query.trim()}”` : "Create new client"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
