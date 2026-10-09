"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastContextType = {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Each toast is a solid elevated surface with a status tint layered on top, so it stays
 * opaque and readable over any page content in both themes.
 */
const TOAST_STYLES: Record<ToastType, { box: string; icon: string }> = {
  success: {
    box: "border-success-border border-l-success bg-[linear-gradient(var(--success-bg),var(--success-bg))]",
    icon: "text-success",
  },
  error: {
    box: "border-danger-border border-l-danger bg-[linear-gradient(var(--danger-bg),var(--danger-bg))]",
    icon: "text-danger",
  },
  warning: {
    box: "border-warning-border border-l-warning bg-[linear-gradient(var(--warning-bg),var(--warning-bg))]",
    icon: "text-warning",
  },
  info: {
    box: "border-accent-border border-l-accent bg-[linear-gradient(var(--accent-bg),var(--accent-bg))]",
    icon: "text-accent",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => toast("success", title, message), [toast]);
  const error = useCallback((title: string, message?: string) => toast("error", title, message), [toast]);
  const warning = useCallback((title: string, message?: string) => toast("warning", title, message), [toast]);
  const info = useCallback((title: string, message?: string) => toast("info", title, message), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* TOAST CONTAINER — full width at the bottom on phones, bottom-right card stack from sm up */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[9999] flex flex-col gap-2.5 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
      >
        {toasts.map((t) => {
          const styles = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex animate-[fadeInUp_0.25s_cubic-bezier(0.16,1,0.3,1)] items-start gap-3 rounded-xl border border-l-4 bg-elevated px-4 py-3 text-fg shadow-card",
                styles.box
              )}
            >
              <div className={cn("mt-0.5 shrink-0", styles.icon)}>
                {t.type === "success" && <CheckCircle2 size={18} />}
                {t.type === "error" && <AlertCircle size={18} />}
                {t.type === "warning" && <AlertTriangle size={18} />}
                {t.type === "info" && <Info size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-tight text-fg">{t.title}</div>
                {t.message && <div className="mt-1 text-xs leading-snug text-fg-muted">{t.message}</div>}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                title="Dismiss"
                className="-mr-1 mt-0.5 shrink-0 rounded-md p-0.5 text-fg-subtle transition hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
