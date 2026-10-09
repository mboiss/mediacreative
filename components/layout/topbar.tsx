"use client";

import { Moon, Sun, Menu, Clock } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "./UserMenu";

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
  const [digitalTime, setDigitalTime] = useState("");
  const [ampm, setAmpm] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();

      // English Date: Mon, 27 Jul 2026
      const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
      const month = now.toLocaleDateString("en-US", { month: "short" });
      const day = now.getDate();
      const year = now.getFullYear();
      setDateStr(`${weekday}, ${day} ${month} ${year}`);

      // 12-hour Time format with AM/PM
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const formattedHours = String(hours).padStart(2, "0");

      setDigitalTime(`${formattedHours}:${minutes}:${seconds}`);
      setAmpm(period);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
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
        {/* Clock — hidden on small screens to keep the bar from overflowing */}
        {mounted && (
          <div className="hidden items-center gap-2 rounded-control border border-line bg-surface px-3 py-1 lg:flex">
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-[7px] rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
              <Clock size={14} className="text-accent" aria-hidden />
            </div>

            <span className="whitespace-nowrap text-xs font-semibold tracking-wide text-fg-muted">{dateStr}</span>

            <span aria-hidden className="h-3.5 w-px bg-line-strong" />

            <div className="flex items-center gap-1">
              <span className="font-mono text-[0.8125rem] font-bold tabular-nums tracking-wider text-fg">{digitalTime}</span>
              <span className="rounded border border-accent-border bg-accent-bg px-1 text-xs font-extrabold uppercase leading-tight text-accent">
                {ampm}
              </span>
            </div>
          </div>
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
