"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

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
      {/* TOAST CONTAINER */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
          maxWidth: 380,
          width: "100%",
        }}
      >
        <style>{`
          @keyframes toastSlideIn {
            from { transform: translateX(100%) scale(0.9); opacity: 0; }
            to { transform: translateX(0) scale(1); opacity: 1; }
          }
        `}</style>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              background:
                t.type === "success"
                  ? "rgba(16, 185, 129, 0.95)"
                  : t.type === "error"
                  ? "rgba(239, 68, 68, 0.95)"
                  : t.type === "warning"
                  ? "rgba(245, 158, 11, 0.95)"
                  : "rgba(0, 212, 255, 0.95)",
              color: "#ffffff",
              borderRadius: 14,
              padding: "12px 16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ marginTop: 2, flexShrink: 0 }}>
              {t.type === "success" && <CheckCircle2 size={18} />}
              {t.type === "error" && <AlertCircle size={18} />}
              {t.type === "warning" && <AlertTriangle size={18} />}
              {t.type === "info" && <Info size={18} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", lineHeight: 1.2 }}>{t.title}</div>
              {t.message && (
                <div style={{ fontSize: "0.78rem", opacity: 0.9, marginTop: 4, lineHeight: 1.3 }}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                padding: 0,
                marginTop: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
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
