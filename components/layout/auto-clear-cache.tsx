"use client";

import { useEffect } from "react";

/**
 * Automatically clears stale local storage cache and browser Cache Storage
 * to ensure all computers/laptops always load fresh live data from Supabase.
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

      // 2. Clear browser CacheStorage if active
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }

      // 3. Unregister any leftover service workers
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
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
