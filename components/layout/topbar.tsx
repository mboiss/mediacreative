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
      
      // English Date: Mon, Jul 27, 2026
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Cool Futuristic Clock */}
        {mounted && (
          <div
            className="topbar-clock-container"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              background: "var(--bg-glass)",
              borderRadius: 10,
              border: "1px solid var(--border)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                  display: "inline-block",
                }}
              />
              <Clock size={14} style={{ color: "#00d4ff" }} />
            </div>

            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {dateStr}
            </span>

            <span style={{ width: 1, height: 14, background: "var(--border)", opacity: 0.6 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "monospace",
                }}
              >
                {digitalTime}
              </span>
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "rgba(0, 212, 255, 0.12)",
                  color: "#00d4ff",
                  border: "1px solid rgba(0, 212, 255, 0.25)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {ampm}
              </span>
            </div>
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

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}