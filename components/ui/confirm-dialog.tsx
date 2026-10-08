"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

/**
 * In-app replacement for window.confirm(). Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete client?", tone: "danger" }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  const danger = options?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal isOpen={!!options} onClose={() => close(false)} title={options?.title ?? ""} maxWidth={420} closeOnOverlayClick>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24 }}>
          {danger && (
            <div
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
              }}
            >
              <AlertTriangle size={18} />
            </div>
          )}
          {options?.message && (
            <div style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>{options.message}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => close(false)}>
            {options?.cancelLabel ?? "Cancel"}
          </button>
          <button className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={() => close(true)} autoFocus>
            {options?.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
