"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wifi,
  Smartphone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  { title: null, items: [{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    title: "Operations",
    items: [
      { name: "Modem WiFi", href: "/rentals", icon: Wifi },
      { name: "eSIM", href: "/esim", icon: Smartphone },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "CRM",
    items: [
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Products", href: "/products", icon: Package },
    ],
  },
  { title: "System", items: [{ name: "Settings", href: "/settings", icon: Settings }] },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

const iconButtonClass =
  "flex shrink-0 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition hover:border-line-accent hover:bg-accent-bg hover:text-accent focus-visible:outline-2 focus-visible:outline-accent";

function NavLink({
  name,
  href,
  icon: Icon,
  active,
  collapsed = false,
  onNavigate,
}: {
  name: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? name : undefined}
      aria-label={collapsed ? name : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl text-sm transition focus-visible:outline-2 focus-visible:outline-accent",
        collapsed ? "justify-center py-3" : "px-3 py-2.5",
        active
          ? "bg-accent-bg font-semibold text-accent"
          : "font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" />
      )}
      <Icon size={18} className={cn("shrink-0", active ? "opacity-100" : "opacity-75 group-hover:opacity-100")} />
      {!collapsed && <span className="truncate">{name}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("media_creative_sidebar_collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileScreen(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const handleMobileToggle = () => {
      setIsMobileOpen((prev) => !prev);
    };
    window.addEventListener("toggleMobileSidebar", handleMobileToggle);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("toggleMobileSidebar", handleMobileToggle);
    };
  }, []);

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("media_creative_sidebar_collapsed", String(next));
      return next;
    });
  }

  // On Mobile, render slide-out drawer or overlay
  if (isMobileScreen) {
    return (
      <>
        {/* Mobile Backdrop Overlay */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            aria-hidden
            className="fixed inset-0 z-[99] animate-fade-in bg-black/60 backdrop-blur-sm"
          />
        )}

        {/* Mobile Slide-Out Sidebar Drawer */}
        <aside
          aria-label="Main navigation"
          inert={!isMobileOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-[100] flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-panel transition-transform duration-250 ease-out",
            isMobileOpen ? "translate-x-0 shadow-card" : "-translate-x-full"
          )}
        >
          {/* Header & Close Button */}
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Image
                src="/logo.png"
                alt="Media Creative Logo"
                width={130}
                height={40}
                className="h-auto w-[130px] object-contain"
                priority
              />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close navigation menu"
              title="Close menu"
              className={cn(iconButtonClass, "size-9")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Mobile Nav */}
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {navSections.map((section) => (
              <div key={section.title ?? "main"} className="flex flex-col gap-1">
                {section.title && (
                  <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{section.title}</div>
                )}
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    name={item.name}
                    href={item.href}
                    icon={item.icon}
                    active={isActivePath(pathname, item.href)}
                    onNavigate={() => setIsMobileOpen(false)}
                  />
                ))}
              </div>
            ))}
          </nav>

          <div className="border-t border-line px-5 py-4 text-xs text-fg-subtle">© 2026 Media Creative</div>
        </aside>
      </>
    );
  }

  // Desktop Responsive Sidebar
  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-line bg-[var(--sidebar-bg)] transition-[width] duration-250 ease-out",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header & Logo */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-line",
          isCollapsed ? "flex-col justify-center px-2.5 py-4" : "justify-between px-4 py-4"
        )}
      >
        {!isCollapsed && (
          <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
            <Image
              src="/logo.png"
              alt="Media Creative Logo"
              width={140}
              height={44}
              className="h-auto w-[135px] object-contain"
              priority
            />
          </div>
        )}

        {isCollapsed && (
          <Image
            src="/icon.png"
            alt="Media Creative"
            width={34}
            height={34}
            className="rounded-lg object-contain"
            priority
          />
        )}

        {/* Toggle Button */}
        {mounted && (
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(iconButtonClass, "size-8", isCollapsed && "mt-1.5")}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className={cn("flex flex-1 flex-col gap-1 py-3", isCollapsed ? "px-2" : "px-3")}>
        {navSections.map((section, i) => (
          <div key={section.title ?? "main"} className="flex flex-col gap-1">
            {section.title &&
              (isCollapsed ? (
                i > 0 && <div aria-hidden className="mx-2 my-2 h-px bg-line" />
              ) : (
                <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{section.title}</div>
              ))}
            {section.items.map((item) => (
              <NavLink
                key={item.name}
                name={item.name}
                href={item.href}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
                collapsed={isCollapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="whitespace-nowrap border-t border-line px-5 py-4 text-xs text-fg-subtle">© 2026 Media Creative</div>
      )}
    </aside>
  );
}
