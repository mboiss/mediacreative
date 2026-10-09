"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  BarChart3,
  CornerDownLeft,
  FilePlus,
  FileText,
  LayoutDashboard,
  Loader2,
  MapPin,
  Package,
  Search,
  Settings,
  Smartphone,
  User,
  Users,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResponse = {
  clients: { id: string; name: string; company: string | null; email: string | null }[];
  invoices: { id: string; invoice_number: string | null; client: string | null; status: string | null }[];
  tours: { id: string; tourcode: string | null; tl: string | null; location: string | null; status: string | null }[];
};

type PaletteItem = {
  key: string;
  group: string;
  label: string;
  sublabel?: string | null;
  href: string;
  icon: ReactNode;
};

const PAGES: { label: string; href: string; icon: ReactNode; keywords?: string }[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard />, keywords: "home overview" },
  { label: "Modem WiFi", href: "/rentals", icon: <Wifi />, keywords: "rentals tours modem wifi" },
  { label: "eSIM", href: "/esim", icon: <Smartphone />, keywords: "esim sim" },
  { label: "Invoices", href: "/invoices", icon: <FileText />, keywords: "billing" },
  { label: "New Invoice", href: "/invoices/new", icon: <FilePlus />, keywords: "create add invoice" },
  { label: "Reports", href: "/reports", icon: <BarChart3 />, keywords: "analytics" },
  { label: "Clients", href: "/clients", icon: <Users />, keywords: "customers" },
  { label: "Products", href: "/products", icon: <Package />, keywords: "catalog items" },
  { label: "Settings", href: "/settings", icon: <Settings />, keywords: "preferences" },
];

const EMPTY_RESULTS: SearchResponse = { clients: [], invoices: [], tours: [] };
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

const triggerFocus = "focus-visible:outline-2 focus-visible:outline-accent";

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  // Global shortcut: Ctrl+K / ⌘K toggles the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset when closed so the next open starts fresh.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setError(null);
      setLoading(false);
      setActive(0);
    }
  }, [open]);

  // Debounced remote search.
  const trimmed = query.trim();
  useEffect(() => {
    if (!open || trimmed.length < MIN_QUERY) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Search failed");
        setResults({
          clients: data.clients ?? [],
          invoices: data.invoices ?? [],
          tours: data.tours ?? [],
        });
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults(EMPTY_RESULTS);
        setError("Search is unavailable right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, open]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = trimmed.toLowerCase();
    const pages = PAGES.filter(
      (p) => !q || p.label.toLowerCase().includes(q) || (p.keywords ?? "").includes(q)
    ).map<PaletteItem>((p) => ({
      key: `page:${p.href}`,
      group: "Go to",
      label: p.label,
      href: p.href,
      icon: p.icon,
    }));

    const clients = results.clients.map<PaletteItem>((c) => ({
      key: `client:${c.id}`,
      group: "Clients",
      label: c.name,
      sublabel: [c.company !== c.name ? c.company : null, c.email].filter(Boolean).join(" · ") || null,
      href: `/clients/${c.id}`,
      icon: <User />,
    }));
    const invoices = results.invoices.map<PaletteItem>((i) => ({
      key: `invoice:${i.id}`,
      group: "Invoices",
      label: i.invoice_number || "Invoice",
      sublabel: [i.client, i.status].filter(Boolean).join(" · ") || null,
      href: `/invoices/${i.id}`,
      icon: <FileText />,
    }));
    const tours = results.tours.map<PaletteItem>((t) => ({
      key: `tour:${t.id}`,
      group: "Tours",
      label: t.tourcode || "Tour",
      sublabel: [t.tl, t.location, t.status].filter(Boolean).join(" · ") || null,
      href: `/rentals?search=${encodeURIComponent(t.tourcode ?? "")}`,
      icon: <MapPin />,
    }));

    // Search hits first when there is a query; page shortcuts first otherwise.
    return q ? [...clients, ...invoices, ...tours, ...pages] : pages;
  }, [results, trimmed]);

  // Keep the highlighted item in range as results change.
  useEffect(() => {
    setActive(0);
  }, [items]);

  // Scroll the highlighted option into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(items[active]);
    }
  }

  // Group items for rendering while keeping their flat index for keyboard navigation.
  const groups: { name: string; entries: { item: PaletteItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.entries.push({ item, index });
    else groups.push({ name: item.group, entries: [{ item, index }] });
  });

  const shortcutLabel = isMac ? "⌘K" : "Ctrl K";
  const searching = trimmed.length >= MIN_QUERY;
  const noRemoteHits =
    searching && !loading && !error && results.clients.length + results.invoices.length + results.tours.length === 0;
  const activeId = items[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Desktop: field-looking trigger */}
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={`Search (${shortcutLabel})`}
          className={cn(
            "hidden h-9 w-56 items-center gap-2 rounded-control border border-line bg-inset px-3 text-sm text-fg-subtle transition hover:border-line-accent hover:text-fg-muted md:flex lg:w-64",
            triggerFocus
          )}
        >
          <Search size={15} aria-hidden className="shrink-0" />
          <span className="flex-1 truncate text-left">Search…</span>
          <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-xs font-medium text-fg-subtle">
            {shortcutLabel}
          </kbd>
        </button>
      </Dialog.Trigger>
      {/* Phones/tablets: icon trigger */}
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Search"
          title="Search"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition hover:border-line-accent hover:bg-surface-hover hover:text-fg md:hidden",
            triggerFocus
          )}
        >
          <Search size={16} aria-hidden />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] animate-fade-in bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            // Focus the input (Radix would otherwise focus the first focusable element).
            e.preventDefault();
            (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input")?.focus();
          }}
          className="fixed inset-x-3 top-[8vh] z-[101] mx-auto flex max-h-[80dvh] w-auto max-w-xl animate-fade-in-up flex-col overflow-hidden rounded-card border border-line bg-elevated text-fg shadow-pop sm:top-[12vh]"
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>

          <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-4">
            {loading ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-accent" aria-hidden />
            ) : (
              <Search size={18} className="shrink-0 text-fg-subtle" aria-hidden />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search clients, invoices, tours or pages…"
              aria-label="Search clients, invoices, tours or pages"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm"
            />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close search"
                title="Close (Esc)"
                className={cn(
                  "shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-xs font-medium text-fg-subtle hover:text-fg",
                  triggerFocus
                )}
              >
                Esc
              </button>
            </Dialog.Close>
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
            {error && <p className="px-3 py-2 text-sm text-danger">{error}</p>}
            {trimmed.length > 0 && trimmed.length < MIN_QUERY && (
              <p className="px-3 py-2 text-xs text-fg-subtle">Type at least {MIN_QUERY} characters to search records.</p>
            )}
            {noRemoteHits && (
              <p className="px-3 py-2 text-sm text-fg-muted">
                No clients, invoices or tours match &ldquo;{trimmed}&rdquo;.
              </p>
            )}
            {searching && loading && items.every((i) => i.group === "Go to") && (
              <p className="px-3 py-2 text-xs text-fg-subtle" role="status">
                Searching…
              </p>
            )}

            {groups.map((group) => (
              <div key={group.name} role="group" aria-label={group.name} className="mb-1 last:mb-0">
                <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  {group.name}
                </div>
                {group.entries.map(({ item, index }) => {
                  const isActive = index === active;
                  return (
                    <div
                      key={item.key}
                      id={`${listId}-opt-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => !isActive && setActive(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm",
                        "[&_svg]:size-4 [&_svg]:shrink-0",
                        isActive ? "bg-accent-bg text-fg [&_svg]:text-accent" : "text-fg-muted [&_svg]:text-fg-subtle"
                      )}
                    >
                      {item.icon}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-fg">{item.label}</span>
                        {item.sublabel && <span className="block truncate text-xs text-fg-subtle">{item.sublabel}</span>}
                      </span>
                      {isActive && <CornerDownLeft aria-hidden className="hidden sm:block" />}
                    </div>
                  );
                })}
              </div>
            ))}

            {items.length === 0 && !loading && !error && !noRemoteHits && (
              <p className="px-3 py-6 text-center text-sm text-fg-muted">Nothing found.</p>
            )}
          </div>

          <div className="hidden shrink-0 items-center gap-4 border-t border-line px-4 py-2 text-xs text-fg-subtle sm:flex">
            <span>
              <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-sans">Enter</kbd> to open
            </span>
            <span>
              <kbd className="font-sans">Esc</kbd> to close
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
