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
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Modem Wifi", href: "/rentals", icon: Wifi },
  { name: "eSIM", href: "/esim", icon: Smartphone },
  { name: "Products", href: "/products", icon: Package },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

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

  const sidebarWidth = isMobileScreen ? 280 : isCollapsed ? 72 : 256;

  // On Mobile, render slide-out drawer or overlay
  if (isMobileScreen) {
    return (
      <>
        {/* Mobile Backdrop Overlay */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              zIndex: 99,
              animation: "fadeIn 0.2s ease",
            }}
          />
        )}

        {/* Mobile Slide-Out Sidebar Drawer */}
        <aside
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${sidebarWidth}px`,
            background: "#0a1628",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            transform: isMobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isMobileOpen ? "0 0 40px rgba(0, 0, 0, 0.6)" : "none",
            overflowY: "auto",
          }}
        >
          {/* Header & Close Button */}
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Image
                src="/logo.png"
                alt="Media Creative Logo"
                width={130}
                height={40}
                style={{ objectFit: "contain", width: "130px", height: "auto" }}
                priority
              />
              <div style={{ fontSize: "0.65rem", color: "var(--accent-cyan)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Control Center Mobile
              </div>
            </div>

            <button
              onClick={() => setIsMobileOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-glass)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Mobile Nav */}
          <nav style={{ padding: "16px 12px", flex: 1 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px 10px" }}>
              Navigation Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    marginBottom: 6,
                    fontSize: "0.95rem",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                    background: isActive ? "var(--accent-cyan-dim)" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={20} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.8 }} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            © 2026 Media Creative Mobile
          </div>
        </aside>
      </>
    );
  }

  // Desktop Responsive Sidebar
  return (
    <aside
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1), min-width 250ms cubic-bezier(0.4, 0, 0.2, 1), background 200ms ease, border-color 200ms ease",
      }}
    >
      {/* Header & Logo */}
      <div
        style={{
          padding: isCollapsed ? "16px 10px" : "18px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: "8px",
          flexDirection: isCollapsed ? "column" : "row",
          transition: "padding 250ms ease",
        }}
      >
        {!isCollapsed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
            <Image
              src="/logo.png"
              alt="Media Creative Logo"
              width={140}
              height={44}
              style={{ objectFit: "contain", width: "135px", height: "auto" }}
              priority
            />
            <div
              style={{
                fontSize: "0.65rem",
                color: "var(--accent-cyan)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Control Center
            </div>
          </div>
        )}

        {isCollapsed && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Image
              src="/icon.png"
              alt="Media Creative"
              width={34}
              height={34}
              style={{ objectFit: "contain", borderRadius: 8 }}
              priority
            />
          </div>
        )}

        {/* Toggle Button */}
        {mounted && (
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar (Perluas Layar Kerja)" : "Collapse Sidebar (Kecilkan Sidebar)"}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-glass)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 150ms ease",
              marginTop: isCollapsed ? 6 : 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-cyan-dim)";
              e.currentTarget.style.color = "var(--accent-cyan)";
              e.currentTarget.style.borderColor = "var(--border-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-glass)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav style={{ padding: isCollapsed ? "12px 6px" : "12px 10px", flex: 1, transition: "padding 250ms ease" }}>
        {!isCollapsed && (
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 10px 6px" }}>
            Menu
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: 10,
                padding: isCollapsed ? "12px 0" : "10px 12px",
                borderRadius: 12,
                marginBottom: 4,
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                background: isActive
                  ? "var(--accent-cyan-dim)"
                  : "transparent",
                borderLeft: isCollapsed
                  ? "none"
                  : isActive
                  ? "2px solid var(--accent-cyan)"
                  : "2px solid transparent",
                textDecoration: "none",
                transition: "all 150ms ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-glass-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon
                size={18}
                style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}
              />
              {!isCollapsed && (
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: "0.7rem",
            color: "rgba(139,163,199,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          © 2026 Media Creative
        </div>
      )}
    </aside>
  );
}