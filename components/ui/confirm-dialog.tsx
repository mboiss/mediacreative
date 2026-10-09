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
        {(danger || options?.message) && (
          <div className="mb-6 flex items-start gap-3.5">
            {danger && (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-control border border-danger-border bg-danger-bg text-danger">
                <AlertTriangle size={18} aria-hidden />
              </div>
            )}
            {options?.message && <div className="text-sm leading-relaxed text-fg-muted">{options.message}</div>}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost justify-center" onClick={() => close(false)}>
            {options?.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            className={(danger ? "btn btn-danger" : "btn btn-primary") + " justify-center"}
            onClick={() => close(true)}
            autoFocus
          >
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
