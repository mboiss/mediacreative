"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (production only, so it never interferes with dev hot reload). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
