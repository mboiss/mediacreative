"use client";

import { useCallback, useEffect, useState } from "react";
import type { TourLeader } from "@/lib/tour-leaders";
import { useToast } from "@/components/ui/toast";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { reconcileModemStatuses } from "./helpers";
import type { ModemItem, TourRentalLog } from "./types";

/**
 * Loads modems, tours and tour leaders, and keeps them in sync across devices.
 */
export function useRentalsData() {
  const toast = useToast();
  const [modems, setModems] = useState<ModemItem[]>([]);
  const [tourLogs, setTourLogs] = useState<TourRentalLog[]>([]);
  const [tourLeaders, setTourLeaders] = useState<TourLeader[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Modem statuses are always shown derived from the tours; they are only written back to the database
   * when `syncModems` is set, i.e. right after the user changed a tour — never just because the page was opened.
   */
  const loadData = useCallback(async ({ syncModems = false }: { syncModems?: boolean } = {}) => {
    try {
      const ts = Date.now();
      const [modemsRes, toursRes, leadersRes] = await Promise.all([
        fetch(`/api/modems?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/tour-rentals?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
        fetch(`/api/tour-leaders?_t=${ts}`, { cache: "no-store", headers: { Pragma: "no-cache" } }),
      ]);
      if (!modemsRes.ok || !toursRes.ok) {
        throw new Error("Could not load modems or tours");
      }

      const mData = await modemsRes.json();
      const tData = await toursRes.json();
      const fetchedModems: ModemItem[] = Array.isArray(mData) ? mData : [];
      const fetchedTours: TourRentalLog[] = Array.isArray(tData) ? tData : [];

      if (leadersRes.ok) {
        const lData = await leadersRes.json();
        if (Array.isArray(lData)) setTourLeaders(lData);
      }

      const { reconciled, updates } = reconcileModemStatuses(fetchedModems, fetchedTours);
      setTourLogs(fetchedTours);
      setModems(reconciled);

      if (syncModems && updates.length > 0) {
        const results = await Promise.all(
          updates.map((u) =>
            fetch("/api/modems", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(u),
            })
          )
        );
        if (results.some((r) => !r.ok)) {
          toast.error("Modem sync failed", "Some modem statuses could not be updated. Please refresh.");
        }
      }
    } catch (err) {
      console.error("Failed to load rental data from API:", err);
      toast.error("Failed to load data", "Modem and tour data could not be loaded. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch (same as the original page)
    loadData();
  }, [loadData]);

  // Enable Real-time sync across devices
  useRealtimeSync(() => loadData(), { tables: ["modems", "tour_rental_logs", "tour_leaders"] });

  return { modems, setModems, tourLogs, setTourLogs, tourLeaders, loading, loadData };
}
