"use client";

import { useEffect, useState, useRef } from "react";
import { User, LogOut, Settings, ShieldCheck, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function UserMenu() {
  const toast = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        setUserEmail("admin@mediacreative.id");
      }
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail("admin@mediacreative.id");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      toast.info("Logging out...", "Clearing session cookies");
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      } else {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error(err);
      window.location.href = "/login";
    }
  }

  const initial = (userEmail || "A").charAt(0).toUpperCase();

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-glass)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "4px 10px 4px 6px",
          cursor: "pointer",
          color: "var(--text-primary)",
          transition: "all 150ms ease",
        }}
        title="User Account & Session"
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 800,
            color: "white",
            boxShadow: "0 2px 8px rgba(0, 212, 255, 0.25)",
          }}
        >
          {initial}
        </div>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            maxWidth: 130,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userEmail ? userEmail.split("@")[0] : "Admin"}
        </span>
        <ChevronDown size={12} style={{ color: "var(--text-muted)", transition: "transform 150ms ease", transform: isOpen ? "rotate(180deg)" : "none" }} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 230,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "12px",
            boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* USER INFO STRIP */}
          <div style={{ padding: "6px 8px 10px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  background: "rgba(0, 212, 255, 0.15)",
                  color: "#00d4ff",
                  padding: "2px 8px",
                  borderRadius: 10,
                  border: "1px solid rgba(0, 212, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ShieldCheck size={10} /> ADMIN
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail || "admin@mediacreative.id"}
            </div>
          </div>

          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <Settings size={14} style={{ color: "#00d4ff" }} />
            Account Settings
          </Link>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 10,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 150ms ease",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
