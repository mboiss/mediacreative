"use client";

import { Moon, Sun, Menu, CalendarDays } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "./UserMenu";
import CommandPalette from "./command-palette";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/products": "Products",
  "/invoices": "Invoices",
  "/rentals": "Modem Wifi",
  "/esim": "eSIM",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getRouteLabel(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  for (const key of Object.keys(routeLabels)) {
    if (pathname.startsWith(key + "/")) {
      return routeLabels[key];
    }
  }
  return "Dashboard";
}

const iconButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition hover:border-line-accent hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent";

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setDateStr(now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
  }, []);

  function handleOpenMobileSidebar() {
    window.dispatchEvent(new CustomEvent("toggleMobileSidebar"));
  }

  const pageLabel = getRouteLabel(pathname || "");
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-50 flex h-14 min-w-0 items-center justify-between gap-3 border-b border-line bg-[var(--topbar-bg)] px-4 backdrop-blur-xl sm:h-[60px] sm:px-5">
      {/* Left: Hamburger (mobile) + Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {/* Sidebar becomes a drawer below 768px (see sidebar.tsx), so the hamburger shows below md. */}
        <button
          type="button"
          onClick={handleOpenMobileSidebar}
          aria-label="Open navigation menu"
          title="Open menu"
          className={`${iconButtonClass} text-fg md:hidden`}
        >
          <Menu size={18} />
        </button>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
          <span className="hidden shrink-0 text-xs font-medium text-fg-subtle sm:inline">Media Creative</span>
          <span aria-hidden className="hidden shrink-0 text-xs text-fg-subtle sm:inline">
            /
          </span>
          <span aria-current="page" className="truncate text-sm font-bold text-fg">
            {pageLabel}
          </span>
        </nav>
      </div>

      {/* Right: controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Global search (Ctrl+K / ⌘K) */}
        <CommandPalette />

        {/* Today's date (no ticking clock — calmer, and the OS already shows the time) */}
        {mounted && dateStr && (
          <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs font-medium text-fg-muted lg:flex">
            <CalendarDays size={14} className="text-fg-subtle" aria-hidden />
            {dateStr}
          </span>
        )}

        {/* Theme toggle */}
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
            className={iconButtonClass}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
