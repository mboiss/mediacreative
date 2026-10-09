"use client";

import { useEffect } from "react";

/** Cache names owned by the PWA service worker (public/sw.js) — never cleared automatically. */
const PWA_CACHE_PREFIX = "mc-";

/**
 * Clears leftovers from older app versions (local fallback data, old caches and old service workers)
 * so every device loads fresh data from Supabase. The PWA's own service worker (/sw.js) and its
 * caches are kept, otherwise the app could not be installed.
 */
export function AutoClearCache() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // 1. Clear old local fallback cache keys that caused stale data
      const legacyKeys = [
        "media_creative_tour_logs",
        "media_creative_tour_leaders",
        "media_creative_payment_accounts",
        "media_creative_settings",
      ];

      legacyKeys.forEach((key) => {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
        }
      });

      // 2. Clear old CacheStorage entries (not the PWA's own caches)
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.filter((name) => !name.startsWith(PWA_CACHE_PREFIX)).forEach((name) => caches.delete(name));
        });
      }

      // 3. Unregister leftover service workers other than the PWA's /sw.js
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            const url = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? "";
            if (!url.endsWith("/sw.js")) registration.unregister();
          });
        });
      }
    } catch (err) {
      console.warn("AutoClearCache notice:", err);
    }
  }, []);

  return null;
}

export function forceClearBrowserCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.clear();
    sessionStorage.clear();

    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }
  } catch (err) {
    console.error("Force clear cache failed:", err);
  } finally {
    window.location.reload();
  }
}
