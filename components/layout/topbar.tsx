"use client";

import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleOpenMobileSidebar() {
    window.dispatchEvent(new CustomEvent("toggleMobileSidebar"));
  }

  const pageLabel = getRouteLabel(pathname || "");

  return (
    <header
      className="topbar-header"
      style={{
        display: "flex",
        height: 60,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "var(--topbar-bg)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "background 200ms ease, border-color 200ms ease",
      }}
    >
      {/* Left: Hamburger (mobile) + Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleOpenMobileSidebar}
          className="mobile-menu-btn"
          title="Open Mobile Navigation Menu"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-glass)",
            color: "var(--text-primary)",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Menu size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Media Creative
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>/</span>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {pageLabel}
          </span>
        </div>
      </div>

      {/* Right: controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Clock */}
        {mounted && (
          <div
            className="topbar-clock"
            style={{
              padding: "5px 10px",
              background: "var(--bg-glass)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.04em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {time}
          </div>
        )}

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-glass)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}

        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "white",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0, 212, 255, 0.2)",
          }}
        >
          A
        </div>
      </div>
    </header>
  );
}