"use client";

import { useEffect, useState, useRef } from "react";
import { LogOut, Settings, ShieldCheck, ChevronDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/supabase/client";
import { useToast } from "@/components/ui/toast";
import { forceClearBrowserCache } from "@/components/layout/auto-clear-cache";
import { cn } from "@/lib/utils";

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-accent";

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
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Account menu"
        className="flex items-center gap-2 rounded-full border border-line bg-surface p-1 text-fg transition hover:border-line-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent sm:pr-2.5"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
          {initial}
        </span>
        <span className="hidden max-w-[130px] truncate text-xs font-semibold text-fg-muted sm:inline">
          {userEmail ? userEmail.split("@")[0] : "Admin"}
        </span>
        <ChevronDown
          size={12}
          aria-hidden
          className={cn("hidden text-fg-subtle transition-transform sm:block", isOpen && "rotate-180")}
        />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[100] flex w-60 max-w-[calc(100vw-2rem)] animate-fade-in flex-col gap-1.5 rounded-xl border border-line bg-panel p-2 shadow-pop"
        >
          {/* USER INFO STRIP */}
          <div className="mb-1 border-b border-line px-2 pb-3 pt-1">
            <span className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-line bg-inset px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <ShieldCheck size={12} aria-hidden /> Admin
            </span>
            <div className="truncate text-sm font-semibold text-fg">{userEmail || "admin@mediacreative.id"}</div>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className={cn(menuItemClass, "text-fg-muted hover:bg-surface-hover hover:text-fg")}
          >
            <Settings size={14} aria-hidden />
            Account Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              toast.info("Clearing Cache", "Purging local storage & reloading...");
              forceClearBrowserCache();
            }}
            className={cn(
              menuItemClass,
              "text-fg-muted hover:bg-surface-hover hover:text-fg"
            )}
          >
            <RefreshCw size={14} aria-hidden />
            Clear Cache & Sync
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className={cn(
              menuItemClass,
              "text-danger hover:bg-danger-bg"
            )}
          >
            <LogOut size={14} aria-hidden />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
