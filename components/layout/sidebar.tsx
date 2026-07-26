"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Wifi,
  Smartphone,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Modem Wifi", href: "/rentals", icon: Wifi },
  { name: "eSIM", href: "/esim", icon: Smartphone },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "256px",
        minWidth: "256px",
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        transition: "background 200ms ease, border-color 200ms ease",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 18px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <Image
          src="/logo.png"
          alt="Media Creative Logo"
          width={160}
          height={50}
          style={{ objectFit: "contain", width: "150px", height: "auto" }}
          priority
        />
        <div
          style={{
            fontSize: "0.68rem",
            color: "var(--accent-cyan)",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Control Center
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 10px 6px" }}>
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 2,
                fontSize: "0.875rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                background: isActive
                  ? "var(--accent-cyan-dim)"
                  : "transparent",
                borderLeft: isActive
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
                size={17}
                style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "0.7rem",
          color: "rgba(139,163,199,0.4)",
        }}
      >
        © 2026 Media Creative
      </div>
    </aside>
  );
}