"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 560,
  closeOnOverlayClick = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex animate-fade-in items-end justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        // Only close if closeOnOverlayClick is explicitly enabled (default is false)
        if (closeOnOverlayClick && e.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full animate-fade-in-up flex-col overflow-hidden rounded-card border border-line bg-elevated text-fg shadow-card sm:max-h-[calc(100dvh-3rem)]"
        // maxWidth is a per-instance numeric prop, so it stays an inline style.
        style={{ maxWidth }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
          <h3 id={titleId} className="min-w-0 truncate text-lg font-bold text-fg">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition hover:border-danger-border hover:bg-danger-bg hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
