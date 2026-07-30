"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/supabase/client";

interface RealtimeSyncOptions {
  intervalMs?: number;
  tables?: string[];
  enabled?: boolean;
}

/**
 * Custom hook to enable real-time updates across multiple tabs/devices.
 * Combines periodic polling, tab focus revalidation, and Supabase Realtime WebSockets.
 */
export function useRealtimeSync(
  onSync: () => void | Promise<void>,
  options: RealtimeSyncOptions = {}
) {
  const { intervalMs = 5000, tables = [], enabled = true } = options;
  const syncRef = useRef(onSync);

  useEffect(() => {
    syncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Initial call
    const triggerSync = () => {
      try {
        syncRef.current();
      } catch (err) {
        console.error("Realtime sync error:", err);
      }
    };

    // 2. Periodic polling
    const timer = setInterval(() => {
      triggerSync();
    }, intervalMs);

    // 3. Tab visibility / window focus revalidation
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        triggerSync();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // 4. Supabase Realtime WebSocket subscription
    let channel: any = null;
    let supabase: any = null;

    try {
      supabase = createClient();
      if (supabase && typeof supabase.channel === "function") {
        const channelName = `realtime-sync-${Date.now()}`;
        channel = supabase.channel(channelName);

        if (tables.length > 0) {
          tables.forEach((table) => {
            channel.on(
              "postgres_changes",
              { event: "*", schema: "public", table },
              () => {
                triggerSync();
              }
            );
          });
        } else {
          channel.on(
            "postgres_changes",
            { event: "*", schema: "public" },
            () => {
              triggerSync();
            }
          );
        }

        channel.subscribe();
      }
    } catch (err) {
      // Gracefully fall back to polling if Supabase Realtime is unavailable
      console.warn("Supabase Realtime subscription not active, using polling sync:", err);
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [intervalMs, enabled, JSON.stringify(tables)]);
}
