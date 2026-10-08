"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wifi,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Copy,
  Check,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Radio,
  FileText,
  MapPin,
  Tag,
  SlidersHorizontal,
  X,
  Eye,
  Info,
  ExternalLink,
  Share2,
  Download,
  CheckSquare,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { getTourLeaders, TourLeader } from "@/lib/tour-leaders";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { exportToCSV } from "@/lib/export-utils";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export type ModemItem = {
  id: string;
  device_name: string;
  number: string;
  ssid: string;
  password: string;
  status: "Available" | "Rented" | "Maintenance";
  remark?: string;
};

export type TourRentalLog = {
  tourcode: string;
  start_date: string;
  end_date: string;
  days: number;
  qty: number;
  location: string;
  tl: string;
  status: "Running" | "Upcoming" | "Finish" | "Cancel";
  modems: string;
  invoice_status: "Paid" | "Unpaid" | "Pending";
  remark?: string;
  notes?: string;
  device_pax?: Record<string, string>; // e.g. { "MC1": "Miss Julia Aimée", "MC2": "Miss Kimberley" }
};

function parseTourDate(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return Date.now();
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).getTime();
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(parts[0], 10) || 1;
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const month = months[mStr] !== undefined ? months[mStr] : (parseInt(parts[1], 10) - 1 || 0);
    let year = parseInt(parts[2], 10) || 2026;
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  }
  const d = new Date(dateStr).getTime();
  return isNaN(d) || d === 0 ? Date.now() : d;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

/**
 * A modem's status follows the tours it is assigned to: assigned to a Running/Upcoming tour = Rented,
 * otherwise Available (Maintenance is always left alone). Returns the corrected list and the rows that differ.
 */
function reconcileModemStatuses(modems: ModemItem[], tours: TourRentalLog[]) {
  const activeTours = tours.filter((t) => t.status === "Running" || t.status === "Upcoming");
  const updates: Array<{ id: string; status: ModemItem["status"]; remark: string | null }> = [];

  const reconciled = modems.map((m) => {
    if (m.status === "Maintenance") return m;
    const mcCode = m.ssid.replace("Media Creative ", "MC");
    const activeTour = activeTours.find((t) => {
      const assignedList = t.modems.split(",").map((s) => s.trim());
      return assignedList.includes(mcCode) || assignedList.includes(m.ssid);
    });

    const expectedStatus: ModemItem["status"] = activeTour ? "Rented" : "Available";
    const expectedRemark = activeTour ? `${activeTour.tourcode} (TL: ${activeTour.tl})` : null;

    const isRemarkFromFinishedTour = !activeTour && m.remark && !m.remark.toLowerCase().includes("no bat") && !m.remark.toLowerCase().includes("kartu mati") && !m.remark.toLowerCase().includes("my telkomsel");

    if (m.status !== expectedStatus || (isRemarkFromFinishedTour && m.remark !== null)) {
      const newRemark = expectedRemark !== null ? expectedRemark : (isRemarkFromFinishedTour ? null : m.remark ?? null);
      updates.push({ id: m.id, status: expectedStatus, remark: newRemark });
      return { ...m, status: expectedStatus, remark: newRemark || undefined };
    }
    return m;
  });

  return { reconciled, updates };
}

export default function ModemWifiPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<"inventory" | "tours">("tours");

  const [modems, setModems] = useState<ModemItem[]>([]);
  const [tourLogs, setTourLogs] = useState<TourRentalLog[]>([]);
  const [tourLeaders, setTourLeaders] = useState<TourLeader[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [tourStatusFilter, setTourStatusFilter] = useState<string>("All");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("All");
  const [dateSortOrder, setDateSortOrder] = useState<"newest" | "oldest">("newest");

  type ModemSortField = "ssid" | "device_name" | "number" | "status";
  const [modemSortField, setModemSortField] = useState<ModemSortField>("ssid");
  const [modemSortOrder, setModemSortOrder] = useState<"asc" | "desc">("asc");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedTourDetail, setSelectedTourDetail] = useState<TourRentalLog | null>(null);

  const [editingModem, setEditingModem] = useState<ModemItem | null>(null);
  const [editingTourCode, setEditingTourCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /**
   * Loads modems, tours and tour leaders. Modem statuses are always shown derived from the tours;
   * they are only written back to the database when `syncModems` is set, i.e. right after the user
   * changed a tour — never just because the page was opened.
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
    loadData();
  }, [loadData]);

  // Enable Real-time sync across devices
  useRealtimeSync(() => loadData(), { tables: ["modems", "tour_rental_logs", "tour_leaders"] });

  // 1-CLICK WHATSAPP DISPATCHER
  function handleWhatsAppShare(tour: TourRentalLog) {
    const assignedList = tour.modems.split(",").map((s) => s.trim()).filter(Boolean);

    // Build modem wifi details text
    const modemDetails = assignedList
      .map((mcCode) => {
        const match = modems.find(
          (m) => m.ssid.replace("Media Creative ", "MC") === mcCode || m.ssid === mcCode
        );
        const paxName = tour.device_pax?.[mcCode] || "Guest";
        if (match) {
          return `📱 *${match.ssid}* (${match.device_name})\n🔑 Pass: \`${match.password}\`\n📞 SIM: ${match.number}\n👤 Pax: ${paxName}`;
        }
        return `📱 *Modem ${mcCode}*\n👤 Pax: ${paxName}`;
      })
      .join("\n\n");

    const message = `*MEDIA CREATIVE - TOUR MODEM RENTAL DETAILS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ *Tourcode:* ${tour.tourcode}\n` +
      `👤 *Tour Leader:* ${tour.tl}\n` +
      `📅 *Period:* ${tour.start_date} s/d ${tour.end_date} (${tour.days} Days)\n` +
      `📍 *Location:* ${tour.location}\n` +
      `📦 *Qty Modems:* ${tour.qty} Unit(s)\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*DATA MODEM WIFI:*\n${modemDetails || "Modem belum ditugaskan"}\n\n` +
      `*Catatan:* Harap pastikan modem & charger selalu dijaga selama tour berlangsung. Terima kasih! 🙏`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    toast.success("WhatsApp Dispatcher", `Order detail for ${tour.tourcode} ready to send via WhatsApp`);
  }

  // EXPORT CSV UTILITY
  function handleExportModems() {
    exportToCSV("modem_inventory_export", modems, [
      { key: "ssid", label: "SSID / Name" },
      { key: "device_name", label: "Device Name" },
      { key: "number", label: "SIM Number" },
      { key: "password", label: "Password" },
      { key: "status", label: "Status" },
      { key: "remark", label: "Remark" },
    ]);
    toast.info("Exporting Modems", "CSV download started");
  }

  function handleExportTours() {
    exportToCSV("tour_rental_logs_export", tourLogs, [
      { key: "tourcode", label: "Tour Code" },
      { key: "tl", label: "Tour Leader" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "days", label: "Days" },
      { key: "qty", label: "Qty Modems" },
      { key: "modems", label: "Assigned Modems" },
      { key: "location", label: "Location" },
      { key: "status", label: "Status" },
      { key: "invoice_status", label: "Invoice Status" },
      { key: "remark", label: "Pax / Remark" },
    ]);
    toast.info("Exporting Tour Logs", "CSV download started");
  }

  // Date converter helper for <input type="date" />
  function formatDateForInput(dateStr?: string): string {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const timestamp = parseTourDate(dateStr);
    if (timestamp > 0) {
      const d = new Date(timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return new Date().toISOString().split("T")[0];
  }

  // Form State: Add/Edit Modem Device
  const [form, setForm] = useState({
    device_name: "",
    number: "",
    ssid: "",
    password: "",
    status: "Available" as ModemItem["status"],
    remark: "",
  });

  // Form State: New Tour / Rental Order
  const [tourForm, setTourForm] = useState({
    tourcode: "",
    start_date: "",
    end_date: "",
    location: "",
    tl: "",
    status: "Upcoming" as TourRentalLog["status"],
    invoice_status: "Pending" as TourRentalLog["invoice_status"],
    selectedModemSsids: [] as string[],
    devicePaxMap: {} as Record<string, string>, // PER-MODEM PAX NAME MAP e.g. { "MC1": "Miss Julia" }
    remark: "",
    notes: "",
  });

  // Lookup helper: Find tour assigned to a modem
  function getAssignedTourForModem(modem: ModemItem): TourRentalLog | undefined {
    const mcCode = modem.ssid.replace("Media Creative ", "MC");
    return tourLogs.find((t) => {
      if (t.status === "Finish" || t.status === "Cancel") return false;
      const assignedList = t.modems.split(",").map((s) => s.trim());
      if (assignedList.includes(mcCode) || assignedList.includes(modem.ssid)) return true;
      if (modem.remark && modem.remark.includes(t.tourcode)) return true;
      return false;
    });
  }

  // Open Add/Edit Device
  function handleOpenAdd() {
    setEditingModem(null);
    const nextNum = modems.length + 1;
    setForm({
      device_name: `Orbitmifi_NEW`,
      number: "08123456789",
      ssid: `Media Creative ${nextNum}`,
      password: `MC${nextNum}#2026`,
      status: "Available",
      remark: "",
    });
    setShowModal(true);
  }

  function handleOpenEdit(m: ModemItem) {
    setEditingModem(m);
    setForm({
      device_name: m.device_name,
      number: m.number,
      ssid: m.ssid,
      password: m.password,
      status: m.status,
      remark: m.remark || "",
    });
    setShowModal(true);
  }

  async function handleSubmitDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!form.device_name.trim() || !form.number.trim() || !form.ssid.trim()) {
      toast.warning("Missing fields", "Device name, SIM number and SSID are required.");
      return;
    }

    const payload = {
      device_name: form.device_name.trim(),
      number: form.number.trim(),
      ssid: form.ssid.trim(),
      password: form.password.trim(),
      status: form.status,
      remark: form.remark.trim() || undefined,
    };

    try {
      if (editingModem) {
        const res = await fetch("/api/modems", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingModem.id, ...payload }),
        });
        if (res.ok) {
          setShowModal(false);
          toast.success("Modem Updated", `Device ${payload.ssid} updated successfully`);
          await loadData();
        } else {
          toast.error("Update Failed", "Could not update modem device");
        }
      } else {
        const res = await fetch("/api/modems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "modem-" + Date.now(), ...payload }),
        });
        if (res.ok) {
          setShowModal(false);
          toast.success("Modem Device Saved", `New modem ${payload.ssid} added`);
          await loadData();
        } else {
          toast.error("Save Failed", "Could not save modem device to database");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Failed to save modem device");
    }
  }

  // Open New Tour Rental Modal
  function handleOpenNewTour() {
    setEditingTourCode(null);
    setTourForm({
      tourcode: "",
      start_date: "",
      end_date: "",
      location: "",
      tl: "",
      status: "Upcoming",
      invoice_status: "Pending",
      selectedModemSsids: [],
      devicePaxMap: {},
      remark: "",
      notes: "",
    });
    setShowTourModal(true);
  }

  // Open Edit Existing Tour Modal
  function handleOpenEditTour(tour: TourRentalLog) {
    setEditingTourCode(tour.tourcode);
    const assignedCodes = tour.modems
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const paxMap: Record<string, string> = tour.device_pax ? { ...tour.device_pax } : {};
    assignedCodes.forEach((code) => {
      if (!(code in paxMap)) {
        paxMap[code] = "";
      }
    });

    setTourForm({
      tourcode: tour.tourcode,
      start_date: formatDateForInput(tour.start_date),
      end_date: formatDateForInput(tour.end_date),
      location: tour.location,
      tl: tour.tl,
      status: tour.status,
      invoice_status: tour.invoice_status,
      selectedModemSsids: assignedCodes,
      devicePaxMap: paxMap,
      remark: tour.remark || "",
      notes: tour.notes || "",
    });
    setShowTourModal(true);
  }

  function toggleModemSelectionInTour(ssidLabel: string) {
    const matchingModem = modems.find(
      (m) => m.ssid.replace("Media Creative ", "MC") === ssidLabel || m.ssid === ssidLabel
    );
    const assignedTour = matchingModem ? getAssignedTourForModem(matchingModem) : undefined;
    const isAssignedToThisTour = editingTourCode && assignedTour?.tourcode === editingTourCode;
    const isAvailable = matchingModem ? matchingModem.status !== "Maintenance" && (!assignedTour || isAssignedToThisTour) : true;
    const isCurrentlySelected = tourForm.selectedModemSsids.includes(ssidLabel);

    if (!isAvailable && !isCurrentlySelected) {
      return;
    }

    setTourForm((prev) => {
      const exists = prev.selectedModemSsids.includes(ssidLabel);
      if (exists) {
        const nextSsids = prev.selectedModemSsids.filter((s) => s !== ssidLabel);
        const nextPaxMap = { ...prev.devicePaxMap };
        delete nextPaxMap[ssidLabel];
        return {
          ...prev,
          selectedModemSsids: nextSsids,
          devicePaxMap: nextPaxMap,
        };
      } else {
        return {
          ...prev,
          selectedModemSsids: [...prev.selectedModemSsids, ssidLabel],
          devicePaxMap: { ...prev.devicePaxMap, [ssidLabel]: "" },
        };
      }
    });
  }

  async function handleSaveNewTour(e: React.FormEvent) {
    e.preventDefault();

    if (!tourForm.tourcode.trim()) {
      toast.warning("Missing Tourcode", "Please enter a tour code.");
      return;
    }
    if (!tourForm.tl.trim()) {
      toast.warning("Missing Tour Leader", "Please select a tour leader.");
      return;
    }

    if (tourForm.status !== "Upcoming" && tourForm.selectedModemSsids.length === 0) {
      toast.warning("Modem Selection Required", "Select at least one modem for a tour that is not Upcoming.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const defaultEndStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split("T")[0];
    })();

    const rawStart = tourForm.start_date || todayStr;
    const rawEnd = tourForm.end_date || defaultEndStr;

    const sDate = new Date(rawStart);
    const eDate = new Date(rawEnd);
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const formattedStart = formatDateDisplay(rawStart);
    const formattedEnd = formatDateDisplay(rawEnd);

    const modemLabels = tourForm.selectedModemSsids.join(", ");

    const paxList = Object.entries(tourForm.devicePaxMap)
      .filter(([_, pax]) => pax.trim().length > 0)
      .map(([mCode, pax]) => `${pax.trim()}`);
    const combinedPaxRemark = paxList.join(", ") || tourForm.remark.trim();

    const updatedTour = {
      tourcode: tourForm.tourcode.trim(),
      start_date: formattedStart,
      end_date: formattedEnd,
      days: diffDays,
      qty: tourForm.selectedModemSsids.length,
      location: tourForm.location.trim() || "Sanur, Bali",
      tl: tourForm.tl.trim(),
      status: tourForm.status,
      modems: modemLabels,
      invoice_status: tourForm.invoice_status,
      remark: combinedPaxRemark || undefined,
      notes: tourForm.notes.trim() || undefined,
      device_pax: tourForm.devicePaxMap,
    };

    try {
      const isEdit = !!editingTourCode;
      const res = await fetch("/api/tour-rentals", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTour),
      });

      if (res.ok) {
        const savedTour = await res.json();
        setShowTourModal(false);
        setEditingTourCode(null);
        setActiveTab("tours");
        setSearch("");
        setTourStatusFilter("All");
        setInvoiceStatusFilter("All");
        setDateSortOrder("newest");

        toast.success(
          isEdit ? "Tour Order Updated" : "New Tour Created",
          `Tour ${updatedTour.tourcode} (${updatedTour.tl}) saved`
        );

        if (savedTour && savedTour.tourcode) {
          setTourLogs((prev) => {
            const idx = prev.findIndex((t) => t.tourcode === savedTour.tourcode);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...savedTour };
              return updated;
            }
            return [savedTour, ...prev];
          });
        }

        await loadData({ syncModems: true });
      } else {
        const body = await res.json().catch(() => null);
        toast.error("Save Failed", body?.error || "Failed to save tour rental order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Error saving tour rental order");
    }
  }

  async function updateTourStatus(tourcode: string, newStatus: TourRentalLog["status"]) {
    const tour = tourLogs.find((t) => t.tourcode === tourcode);
    if (!tour || tour.status === newStatus) return;

    const releasesModems = newStatus === "Finish" || newStatus === "Cancel";
    const ok = await confirm({
      title: `Change status to ${newStatus}?`,
      message: (
        <>
          Tour <strong>{tourcode}</strong> will change from <strong>{tour.status}</strong> to <strong>{newStatus}</strong>.
          {releasesModems && tour.modems ? <> Its modems ({tour.modems}) will be marked Available.</> : null}
        </>
      ),
      confirmLabel: `Set ${newStatus}`,
      tone: newStatus === "Cancel" ? "danger" : "default",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error("Status not updated", body?.error || `Could not change status of ${tourcode}`);
        return;
      }
      toast.success("Status Updated", `Tour ${tourcode} status changed to ${newStatus}`);
      await loadData({ syncModems: true });
      if (selectedTourDetail?.tourcode === tourcode) {
        setSelectedTourDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not update the tour status");
    }
  }

  async function updateTourInvoiceStatus(tourcode: string, newInvoiceStatus: TourRentalLog["invoice_status"]) {
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, invoice_status: newInvoiceStatus }),
      });
      if (!res.ok) {
        toast.error("Invoice status not updated", `Could not update ${tourcode}`);
      } else {
        await loadData();
        if (selectedTourDetail?.tourcode === tourcode) {
          setSelectedTourDetail((prev) => (prev ? { ...prev, invoice_status: newInvoiceStatus } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTourNotes(tourcode: string, newNotes: string) {
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, notes: newNotes }),
      });
      if (!res.ok) {
        toast.error("Notes not saved", `Could not save notes for ${tourcode}`);
      } else {
        await loadData();
        if (selectedTourDetail?.tourcode === tourcode) {
          setSelectedTourDetail((prev) => (prev ? { ...prev, notes: newNotes } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  function toggleTourStatus(tourcode: string) {
    const tour = tourLogs.find((t) => t.tourcode === tourcode);
    if (!tour) return;
    const nextStatus: TourRentalLog["status"] =
      tour.status === "Running" ? "Finish" : tour.status === "Upcoming" ? "Running" : "Running";
    updateTourStatus(tourcode, nextStatus);
  }

  async function handleDeleteTour(tourcode: string) {
    const ok = await confirm({
      title: "Delete tour?",
      message: <>Tour <strong>{tourcode}</strong> will be permanently deleted. This cannot be undone.</>,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode }),
      });
      if (!res.ok) {
        toast.error("Delete failed", `Could not delete tour ${tourcode}`);
        return;
      }
      if (selectedTourDetail?.tourcode === tourcode) {
        setSelectedTourDetail(null);
      }
      toast.success("Tour deleted", `Tour ${tourcode} was deleted`);
      await loadData({ syncModems: true });
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not delete the tour");
    }
  }

  async function toggleDeviceStatus(id: string) {
    const item = modems.find((m) => m.id === id);
    if (!item) return;
    const nextStatus: ModemItem["status"] =
      item.status === "Available" ? "Rented" : item.status === "Rented" ? "Maintenance" : "Available";

    try {
      const res = await fetch("/api/modems", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) {
        await loadData();
      } else {
        toast.error("Status not updated", "Could not change the modem status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not change the modem status");
    }
  }

  async function handleDeleteDevice(id: string) {
    const modem = modems.find((m) => m.id === id);
    const ok = await confirm({
      title: "Delete modem?",
      message: <>Modem <strong>{modem?.ssid ?? id}</strong> will be permanently deleted. This cannot be undone.</>,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/modems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setModems((prev) => prev.filter((m) => m.id !== id));
        toast.success("Modem deleted", `${modem?.ssid ?? "Modem"} was deleted`);
      } else {
        toast.error("Delete failed", "Could not delete the modem device");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not delete the modem device");
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleModemSort(field: ModemSortField) {
    if (modemSortField === field) {
      setModemSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setModemSortField(field);
      setModemSortOrder("asc");
    }
  }

  const filteredModems = modems
    .filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.device_name.toLowerCase().includes(q) ||
        item.number.toLowerCase().includes(q) ||
        item.ssid.toLowerCase().includes(q) ||
        item.password.toLowerCase().includes(q) ||
        (item.remark ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (modemSortField === "ssid") {
        cmp = a.ssid.localeCompare(b.ssid, undefined, { numeric: true, sensitivity: "base" });
      } else if (modemSortField === "device_name") {
        cmp = a.device_name.localeCompare(b.device_name, undefined, { numeric: true, sensitivity: "base" });
      } else if (modemSortField === "number") {
        cmp = a.number.localeCompare(b.number);
      } else if (modemSortField === "status") {
        const statusOrder: Record<string, number> = { Available: 1, Rented: 2, Maintenance: 3 };
        cmp = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      }
      return modemSortOrder === "asc" ? cmp : -cmp;
    });

  const filteredTours = tourLogs
    .filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        t.tourcode.toLowerCase().includes(q) ||
        t.tl.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.modems.toLowerCase().includes(q) ||
        (t.remark ?? "").toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q);

      const matchTourStatus = tourStatusFilter === "All" || t.status === tourStatusFilter;
      const matchInvoiceStatus = invoiceStatusFilter === "All" || t.invoice_status === invoiceStatusFilter;

      return matchSearch && matchTourStatus && matchInvoiceStatus;
    })
    .sort((a, b) => {
      const timeA = parseTourDate(a.start_date);
      const timeB = parseTourDate(b.start_date);
      return dateSortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  const tourPagination = usePagination(filteredTours, [search, tourStatusFilter, invoiceStatusFilter, dateSortOrder].join("|"));

  const totalAvailable = modems.filter((m) => m.status === "Available").length;
  const totalRented = modems.filter((m) => m.status === "Rented").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER */}
      <div
        className="animate-fade-in-up"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Modem Wifi & Tour Rental System
            </h1>
            <span
              style={{
                background: "var(--accent-cyan-dim)",
                color: "var(--accent-cyan)",
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 20,
                border: "1px solid var(--accent-cyan)",
              }}
            >
              {modems.length} Devices
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
            Manage Orbit Mifi device inventory, WPA2 passwords, active tour deployments, and Tour Leader allocations.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={activeTab === "tours" ? handleExportTours : handleExportModems} title="Export CSV file">
            <Download size={15} />
            Export {activeTab === "tours" ? "Tours" : "Modems"} CSV
          </button>
          <button className="btn btn-primary" onClick={handleOpenNewTour} style={{ gap: 6 }}>
            <Plus size={16} />
            New Tour / Rental Order
          </button>
          <button className="btn btn-ghost" onClick={handleOpenAdd} style={{ gap: 6, border: "1px solid var(--border)" }}>
            <Plus size={16} />
            Add Modem Device
          </button>
        </div>
      </div>

      {/* VIEW TABS */}
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border)", paddingBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("tours")}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "tours" ? "var(--accent-cyan-dim)" : "transparent",
            color: activeTab === "tours" ? "var(--accent-cyan)" : "var(--text-secondary)",
          }}
        >
          <FileText size={15} /> Tour Tracking & Deployment Logs ({tourLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "inventory" ? "var(--accent-cyan-dim)" : "transparent",
            color: activeTab === "inventory" ? "var(--accent-cyan)" : "var(--text-secondary)",
          }}
        >
          <Wifi size={15} /> Devices Inventory ({modems.length})
        </button>

        {/* MYORBIT TOP-UP SHORTCUT BUTTON */}
        <a
          href="https://www.myorbit.id/dashboard-devices"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: "1px solid rgba(245,158,11,0.4)",
            fontWeight: 700,
            fontSize: "0.88rem",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
            marginLeft: "auto",
          }}
          title="Open MyOrbit Dashboard in new tab to top up modem quota"
        >
          <ExternalLink size={15} /> Top-Up Modem Quota (MyOrbit ↗)
        </a>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Total Inventory", value: `${modems.length} Modems`, color: "var(--accent-cyan)" },
          { label: "Available Stock", value: `${totalAvailable} Units`, color: "var(--accent-emerald)" },
          { label: "Currently Deployed", value: `${totalRented} Units`, color: "#3b82f6" },
          { label: "Active Tour Orders", value: `${tourLogs.filter(t => t.status === "Running" || t.status === "Upcoming").length} Groups`, color: "#f59e0b" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "16px 18px",
              borderLeft: `3px solid ${kpi.color}`,
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              {kpi.label}
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTER BAR */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder={
              activeTab === "inventory"
                ? "Search by Device Name, Number, SSID or Password..."
                : "Search Tourcode, Tour Leader, Hotel Location, Modems..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {activeTab === "inventory" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "Available", "Rented", "Maintenance"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "1px solid",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderColor: statusFilter === st ? "var(--border-accent)" : "var(--border)",
                    background: statusFilter === st ? "var(--accent-cyan-dim)" : "transparent",
                    color: statusFilter === st ? "var(--accent-cyan)" : "var(--text-secondary)",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* MODEM SORT DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Sort Modem:</span>
              <select
                className="form-input form-select"
                value={`${modemSortField}-${modemSortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [ModemSortField, "asc" | "desc"];
                  setModemSortField(field);
                  setModemSortOrder(order);
                }}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600, color: "var(--accent-cyan)" }}
              >
                <option value="ssid-asc">📶 Modem / SSID (MC1 → MC46)</option>
                <option value="ssid-desc">📶 Modem / SSID (MC46 → MC1)</option>
                <option value="device_name-asc">🏷️ Device Name (A → Z)</option>
                <option value="device_name-desc">🏷️ Device Name (Z → A)</option>
                <option value="status-asc">🟢 Status (Available → Deployed → Maint.)</option>
                <option value="status-desc">🔴 Status (Maint. → Deployed → Available)</option>
                <option value="number-asc">📞 SIM Number (Low → High)</option>
                <option value="number-desc">📞 SIM Number (High → Low)</option>
              </select>
            </div>

            {(statusFilter !== "All" || search || modemSortField !== "ssid" || modemSortOrder !== "asc") && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setModemSortField("ssid");
                  setModemSortOrder("asc");
                }}
                style={{ padding: "6px 10px", fontSize: "0.75rem", color: "#f87171" }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {activeTab === "tours" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* TOUR STATUS FILTER DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Tour Status:</span>
              <select
                className="form-input form-select"
                value={tourStatusFilter}
                onChange={(e) => setTourStatusFilter(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600 }}
              >
                <option value="All">All Tour Statuses</option>
                <option value="Running">● Running (Active)</option>
                <option value="Upcoming">● Upcoming</option>
                <option value="Finish">● Finish</option>
                <option value="Cancel">● Cancel</option>
              </select>
            </div>

            {/* INVOICE STATUS FILTER DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Invoice:</span>
              <select
                className="form-input form-select"
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600 }}
              >
                <option value="All">All Invoice Statuses</option>
                <option value="Paid">✓ Paid</option>
                <option value="Pending">⏳ Pending</option>
                <option value="Unpaid">✗ Unpaid</option>
              </select>
            </div>

            {/* DATE SORT DROPDOWN */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>Sort Date:</span>
              <select
                className="form-input form-select"
                value={dateSortOrder}
                onChange={(e) => setDateSortOrder(e.target.value as "newest" | "oldest")}
                style={{ fontSize: "0.8rem", padding: "6px 12px", height: 36, width: "auto", fontWeight: 600, color: "var(--accent-cyan)" }}
              >
                <option value="newest">📅 Newest Date First (Terbaru)</option>
                <option value="oldest">📅 Oldest Date First (Terlama)</option>
              </select>
            </div>

            {(tourStatusFilter !== "All" || invoiceStatusFilter !== "All" || search || dateSortOrder !== "newest") && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setTourStatusFilter("All");
                  setInvoiceStatusFilter("All");
                  setDateSortOrder("newest");
                }}
                style={{ padding: "6px 10px", fontSize: "0.75rem", color: "#f87171" }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTENT TAB 1: DEVICES INVENTORY */}
      {activeTab === "inventory" && (
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <LoadingState label="Loading modems..." />
          ) : filteredModems.length === 0 ? (
            <EmptyState
              icon={<Wifi size={28} />}
              title={search || statusFilter !== "All" ? "No modem units match filter" : "No modem units listed"}
              description={search || statusFilter !== "All" ? "Try clearing your search term or filter status." : "Add your first Orbit Mifi unit."}
              action={
                !search && statusFilter === "All" ? (
                  <button className="btn btn-primary" onClick={handleOpenAdd}>
                    <Plus size={14} /> Add Device
                  </button>
                ) : undefined
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th
                    onClick={() => handleModemSort("device_name")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by Device Name"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Device Name
                      {modemSortField === "device_name" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleModemSort("number")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by SIM Number"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      SIM Number
                      {modemSortField === "number" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleModemSort("ssid")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by Modem / SSID"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Modem / SSID
                      {modemSortField === "ssid" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th>Password</th>
                  <th
                    onClick={() => handleModemSort("status")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Click to sort by Status"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Status
                      {modemSortField === "status" ? (
                        modemSortOrder === "asc" ? <ArrowUp size={13} style={{ color: "var(--accent-cyan)" }} /> : <ArrowDown size={13} style={{ color: "var(--accent-cyan)" }} />
                      ) : (
                        <ArrowUpDown size={13} style={{ opacity: 0.4 }} />
                      )}
                    </div>
                  </th>
                  <th>Assigned Tour & Drop-off Location</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModems.map((item, idx) => {
                  const assignedTour = getAssignedTourForModem(item);
                  const isRented = item.status === "Rented" || !!assignedTour;

                  return (
                    <tr key={item.id} style={{ background: isRented ? "rgba(59,130,246,0.03)" : undefined }}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.88rem" }}>
                          {item.device_name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          {item.number}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                          <Wifi size={13} />
                          {item.ssid}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              background: "rgba(255,255,255,0.06)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.password}
                          </span>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: 4, height: "auto" }}
                            onClick={() => handleCopy(item.password, item.id)}
                            title="Copy Password"
                          >
                            {copiedId === item.id ? <Check size={12} style={{ color: "#10b981" }} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* STATUS BADGE WITH TOUR DETAILS LINK */}
                      <td>
                        {assignedTour ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <span
                              onClick={() => setSelectedTourDetail(assignedTour)}
                              style={{
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: "rgba(59,130,246,0.15)",
                                color: "#3b82f6",
                                border: "1px solid rgba(59,130,246,0.3)",
                              }}
                              title="Click to view Tour Details popup"
                            >
                              <Radio size={11} /> Rented
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedTourDetail(assignedTour)}
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "var(--accent-cyan)",
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                textDecoration: "underline",
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              📌 {assignedTour.tourcode}
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => toggleDeviceStatus(item.id)}
                            style={{
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 12,
                              background:
                                item.status === "Available"
                                  ? "rgba(16,185,129,0.12)"
                                  : item.status === "Rented"
                                  ? "rgba(59,130,246,0.12)"
                                  : "rgba(245,158,11,0.12)",
                              color:
                                item.status === "Available"
                                  ? "#10b981"
                                  : item.status === "Rented"
                                  ? "#3b82f6"
                                  : "#f59e0b",
                              border: `1px solid ${
                                item.status === "Available"
                                  ? "rgba(16,185,129,0.3)"
                                  : item.status === "Rented"
                                  ? "rgba(59,130,246,0.3)"
                                  : "rgba(245,158,11,0.3)"
                              }`,
                            }}
                            title="Click to toggle status"
                          >
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* ASSIGNED TOUR DETAILS COLUMN */}
                      <td>
                        {assignedTour ? (
                          <div
                            onClick={() => setSelectedTourDetail(assignedTour)}
                            style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                            title="Click to view Tour Details popup"
                          >
                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 5 }}>
                              <MapPin size={12} style={{ color: "var(--accent-cyan)" }} />
                              {assignedTour.location}
                            </div>
                            <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                              TL: <strong style={{ color: "var(--text-primary)" }}>{assignedTour.tl}</strong> • {assignedTour.start_date} to {assignedTour.end_date}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {item.remark || "— Unassigned"}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {assignedTour && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "4px 8px", color: "var(--accent-cyan)" }}
                              onClick={() => setSelectedTourDetail(assignedTour)}
                              title="View Tour Details Popup"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Device Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleDeleteDevice(item.id)}
                            title="Delete Device"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONTENT TAB 2: TOUR TRACKING LOG */}
      {activeTab === "tours" && (
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <LoadingState label="Loading tours..." />
          ) : filteredTours.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="No tour logs match filter"
              description="Try clearing your search keyword or create a new tour rental order."
              action={
                <button className="btn btn-primary" onClick={handleOpenNewTour}>
                  <Plus size={14} /> New Tour / Rental Order
                </button>
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tour Code</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => setDateSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                    title="Click to sort by date"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-cyan)" }}>
                      Dates & Duration {dateSortOrder === "newest" ? "↓" : "↑"}
                    </div>
                  </th>
                  <th>Drop-off Hotel</th>
                  <th>Tour Leader (TL)</th>
                  <th>Assigned Modems</th>
                  <th>Tour Status</th>
                  <th>Invoice</th>
                  <th>Pax / Guest Remark</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tourPagination.pageItems.map((t) => (
                  <tr key={t.tourcode}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedTourDetail(t)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            fontWeight: 800,
                            color: "var(--accent-cyan)",
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                            textDecoration: "underline",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title="Click to open Tour Details popup"
                        >
                          {t.tourcode}
                          <ExternalLink size={11} />
                        </button>

                        {t.notes && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "3px",
                              borderRadius: 6,
                              background: "rgba(245, 158, 11, 0.18)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245, 158, 11, 0.35)",
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedTourDetail(t)}
                            title="Tour has notes (Click to view in Tour Details)"
                          >
                            <FileText size={12} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {t.qty > 0 ? `${t.qty} modem${t.qty > 1 ? "s" : ""}` : "No modems"}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                          <Calendar size={13} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                          <span>{t.start_date} – {t.end_date}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 8,
                              background: "rgba(245,158,11,0.12)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245,158,11,0.25)",
                            }}
                          >
                            <Clock size={10} /> {t.days} Days
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.83rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={13} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                        {t.location}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.83rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={13} />
                        {t.tl}
                      </div>
                    </td>
                    <td>
                      {t.modems && t.modems.trim().length > 0 ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            background: "var(--accent-cyan-dim)",
                            color: "var(--text-primary)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {t.modems}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontFamily: "sans-serif",
                            fontSize: "0.74rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            background: "rgba(148,163,184,0.1)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px dashed rgba(148,163,184,0.3)",
                          }}
                        >
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* TOUR STATUS INTERACTIVE SELECTOR */}
                    <td>
                      <select
                        className="form-select"
                        value={t.status}
                        onChange={(e) => updateTourStatus(t.tourcode, e.target.value as TourRentalLog["status"])}
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 12,
                          cursor: "pointer",
                          background:
                            t.status === "Running"
                              ? "rgba(16,185,129,0.15)"
                              : t.status === "Upcoming"
                              ? "rgba(59,130,246,0.15)"
                              : t.status === "Finish"
                              ? "rgba(148,163,184,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            t.status === "Running"
                              ? "#10b981"
                              : t.status === "Upcoming"
                              ? "#3b82f6"
                              : t.status === "Finish"
                              ? "#94a3b8"
                              : "#ef4444",
                          border: `1px solid ${
                            t.status === "Running"
                              ? "rgba(16,185,129,0.3)"
                              : t.status === "Upcoming"
                              ? "rgba(59,130,246,0.3)"
                              : t.status === "Finish"
                              ? "rgba(148,163,184,0.3)"
                              : "rgba(239,68,68,0.3)"
                          }`,
                        }}
                        title="Change tour status (Finish automatically frees modems)"
                      >
                        <option value="Running" style={{ background: "#111827", color: "#10b981" }}>● Running</option>
                        <option value="Upcoming" style={{ background: "#111827", color: "#3b82f6" }}>● Upcoming</option>
                        <option value="Finish" style={{ background: "#111827", color: "#94a3b8" }}>● Finish</option>
                        <option value="Cancel" style={{ background: "#111827", color: "#ef4444" }}>● Cancel</option>
                      </select>
                    </td>

                    {/* INVOICE PAID / UNPAID INTERACTIVE SELECTOR */}
                    <td>
                      <select
                        className="form-select"
                        value={t.invoice_status}
                        onChange={(e) => updateTourInvoiceStatus(t.tourcode, e.target.value as TourRentalLog["invoice_status"])}
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 10,
                          cursor: "pointer",
                          background:
                            t.invoice_status === "Paid"
                              ? "rgba(16,185,129,0.15)"
                              : t.invoice_status === "Pending"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            t.invoice_status === "Paid"
                              ? "#10b981"
                              : t.invoice_status === "Pending"
                              ? "#f59e0b"
                              : "#ef4444",
                          border: `1px solid ${
                            t.invoice_status === "Paid"
                              ? "rgba(16,185,129,0.3)"
                              : t.invoice_status === "Pending"
                              ? "rgba(245,158,11,0.3)"
                              : "rgba(239,68,68,0.3)"
                          }`,
                        }}
                        title="Change invoice payment status"
                      >
                        <option value="Paid" style={{ background: "#111827", color: "#10b981" }}>✓ Paid</option>
                        <option value="Pending" style={{ background: "#111827", color: "#f59e0b" }}>⏳ Pending</option>
                        <option value="Unpaid" style={{ background: "#111827", color: "#ef4444" }}>✗ Unpaid</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                        {t.remark || "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "var(--accent-cyan)" }}
                          onClick={() => setSelectedTourDetail(t)}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "#25D366" }}
                          onClick={() => handleWhatsAppShare(t)}
                          title="Send Order Info via WhatsApp"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 8px", color: "var(--accent-cyan)" }}
                          onClick={() => handleOpenEditTour(t)}
                          title="Edit Tour Details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className={t.status === "Finish" ? "btn btn-ghost" : "btn btn-success"}
                          style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                          onClick={() => toggleTourStatus(t.tourcode)}
                          title="Toggle Finish"
                        >
                          <CheckCircle2 size={12} />
                          {t.status === "Finish" ? "Re-open" : "Finish"}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 8px" }}
                          onClick={() => handleDeleteTour(t.tourcode)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && (
            <Pagination
              page={tourPagination.page}
              totalPages={tourPagination.totalPages}
              totalItems={tourPagination.totalItems}
              pageSize={tourPagination.pageSize}
              onPageChange={tourPagination.setPage}
              onPageSizeChange={tourPagination.setPageSize}
            />
          )}
        </div>
      )}

      {/* POPUP MODAL: TOUR DETAILS & ASSIGNED MODEMS */}
      {selectedTourDetail && (
        <Modal
          isOpen={!!selectedTourDetail}
          onClose={() => setSelectedTourDetail(null)}
          title={`Tour Details — ${selectedTourDetail.tourcode}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* TOP SUMMARY STRIP */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--accent-cyan-dim)",
                borderRadius: 14,
                border: "1px solid var(--accent-cyan)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                  Tour Leader
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={16} style={{ color: "var(--accent-cyan)" }} />
                  {selectedTourDetail.tl}
                </div>
              </div>

              {/* INTERACTIVE STATUS SELECTOR IN POPUP */}
              <select
                className="form-select"
                value={selectedTourDetail.status}
                onChange={(e) => updateTourStatus(selectedTourDetail.tourcode, e.target.value as TourRentalLog["status"])}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 16,
                  cursor: "pointer",
                  background:
                    selectedTourDetail.status === "Running"
                      ? "rgba(16,185,129,0.2)"
                      : selectedTourDetail.status === "Upcoming"
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(148,163,184,0.2)",
                  color:
                    selectedTourDetail.status === "Running"
                      ? "#10b981"
                      : selectedTourDetail.status === "Upcoming"
                      ? "#3b82f6"
                      : "#94a3b8",
                  border: "1px solid currentColor",
                }}
              >
                <option value="Running" style={{ background: "#111827", color: "#10b981" }}>● Running</option>
                <option value="Upcoming" style={{ background: "#111827", color: "#3b82f6" }}>● Upcoming</option>
                <option value="Finish" style={{ background: "#111827", color: "#94a3b8" }}>● Finish</option>
                <option value="Cancel" style={{ background: "#111827", color: "#ef4444" }}>● Cancel</option>
              </select>
            </div>

            {/* DETAILS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.85rem" }}>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>Drop-off Location / Hotel</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={14} style={{ color: "var(--accent-cyan)" }} />
                  {selectedTourDetail.location}
                </div>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>Rental Dates & Duration</div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Calendar size={14} style={{ color: "var(--accent-cyan)" }} />
                  <span>{selectedTourDetail.start_date} – {selectedTourDetail.end_date}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: "rgba(245,158,11,0.12)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={11} /> {selectedTourDetail.days} Days
                  </span>
                </div>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4 }}>Invoice Payment Status</div>
                <select
                  className="form-select"
                  value={selectedTourDetail.invoice_status}
                  onChange={(e) => updateTourInvoiceStatus(selectedTourDetail.tourcode, e.target.value as TourRentalLog["invoice_status"])}
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "var(--bg-glass-hover)",
                    color: selectedTourDetail.invoice_status === "Paid" ? "#10b981" : selectedTourDetail.invoice_status === "Pending" ? "#f59e0b" : "#ef4444",
                    border: "1px solid var(--border)",
                  }}
                >
                  <option value="Paid" style={{ background: "#111827", color: "#10b981" }}>✓ Paid</option>
                  <option value="Pending" style={{ background: "#111827", color: "#f59e0b" }}>⏳ Pending</option>
                  <option value="Unpaid" style={{ background: "#111827", color: "#ef4444" }}>✗ Unpaid</option>
                </select>
              </div>

              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>Pax / Guest Names Summary</div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
                  {selectedTourDetail.remark || "— No pax remarks recorded"}
                </div>
              </div>
            </div>

            {/* FIELD NOTES SECTION IN TOUR DETAILS POPUP */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.05)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={15} />
                  <span>NOTES</span>
                </div>
                {selectedTourDetail.notes && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 6,
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    ✓ Note Active
                  </span>
                )}
              </div>
              <textarea
                className="form-input"
                rows={2}
                style={{
                  fontSize: "0.82rem",
                  padding: "8px 10px",
                  borderRadius: 8,
                  resize: "vertical",
                  background: "var(--bg-glass)",
                  borderColor: selectedTourDetail.notes ? "rgba(245, 158, 11, 0.4)" : "var(--border)",
                  color: "var(--text-primary)",
                  lineHeight: 1.4,
                }}
                placeholder="Ketik catatan khusus / field note untuk tour ini (misal: perlu tambahan charger, instruksi penyerahan modem, info lokasi)..."
                value={selectedTourDetail.notes || ""}
                onChange={(e) => updateTourNotes(selectedTourDetail.tourcode, e.target.value)}
              />
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>💡 Catatan tersimpan otomatis dan akan memunculkan indikator note di daftar tour.</span>
              </div>
            </div>

            {/* ASSIGNED MODEM UNITS CARD WITH PER-MODEM PAX DISPLAY & COPY MODEM NAME BUTTON */}
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Wifi size={15} style={{ color: "var(--accent-cyan)" }} />
                Assigned Modem Units ({selectedTourDetail.qty} Units)
              </div>

              {selectedTourDetail.modems && selectedTourDetail.modems.trim().length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedTourDetail.modems.split(",").map((rawLabel) => {
                    const label = rawLabel.trim();
                    if (!label) return null;
                    const matchingModem = modems.find(
                      (m) => m.ssid.replace("Media Creative ", "MC") === label || m.ssid === label
                    );

                    // Extract per-modem pax name
                    const paxName = selectedTourDetail.device_pax ? selectedTourDetail.device_pax[label] : undefined;
                    const modemFullName = matchingModem ? `${matchingModem.device_name} (${matchingModem.ssid})` : label;
                    const deviceOnlyName = matchingModem ? matchingModem.device_name : label;
                    const nameCopyKey = `name-${label}`;

                    return (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "var(--bg-glass)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              background: "var(--accent-cyan-dim)",
                              color: "var(--accent-cyan)",
                              padding: "3px 8px",
                              borderRadius: 6,
                              border: "1px solid var(--accent-cyan)",
                            }}
                          >
                            {label}
                          </span>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                {modemFullName}
                              </div>
                              {matchingModem && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(deviceOnlyName, nameCopyKey)}
                                  style={{
                                    background: "rgba(0, 212, 255, 0.08)",
                                    border: "1px solid rgba(0, 212, 255, 0.3)",
                                    color: copiedId === nameCopyKey ? "var(--accent-emerald)" : "var(--accent-cyan)",
                                    cursor: "pointer",
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                  }}
                                  title={`Copy ${deviceOnlyName} to clipboard for MyOrbit app`}
                                >
                                  {copiedId === nameCopyKey ? (
                                    <>
                                      <Check size={12} style={{ color: "#10b981" }} />
                                      <span style={{ color: "#10b981" }}>Copied {deviceOnlyName}!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy {deviceOnlyName}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            {paxName ? (
                              <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <User size={12} /> Guest Pax: {paxName}
                              </div>
                            ) : matchingModem ? (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                                SIM: {matchingModem.number}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {matchingModem && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                background: "rgba(0,0,0,0.3)",
                                color: "var(--text-primary)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                              }}
                            >
                              {matchingModem.password}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(matchingModem.password, matchingModem.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: copiedId === matchingModem.id ? "var(--accent-emerald)" : "var(--text-muted)",
                                cursor: "pointer",
                                padding: 4,
                              }}
                              title="Copy WiFi Password"
                            >
                              {copiedId === matchingModem.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.06)",
                    border: "1px dashed rgba(245,158,11,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Info size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  <span>Belum ada unit modem yang dipilih untuk tour ini. Anda dapat memilih modem kapan saja melalui "Edit Tour Details".</span>
                </div>
              )}
            </div>

            <div className="divider" style={{ margin: "4px 0" }} />

            {/* MODAL FOOTER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className={selectedTourDetail.status === "Finish" ? "btn btn-ghost" : "btn btn-success"}
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => toggleTourStatus(selectedTourDetail.tourcode)}
                >
                  <CheckCircle2 size={14} />
                  {selectedTourDetail.status === "Finish" ? "Re-open Tour" : "Mark Tour Finished (Free Modems)"}
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => handleOpenEditTour(selectedTourDetail)}
                >
                  <Edit2 size={14} />
                  Edit Tour Details
                </button>
              </div>

              <button type="button" className="btn btn-ghost" onClick={() => setSelectedTourDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 1: NEW / EDIT TOUR RENTAL ORDER */}
      <Modal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        title={editingTourCode ? `Edit Tour Details — ${editingTourCode}` : "Create New Tour / Modem Rental Order"}
      >
        <form onSubmit={handleSaveNewTour} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Tour Code *</label>
              <input
                className="form-input"
                placeholder="e.g. KIB260805"
                value={tourForm.tourcode}
                onChange={(e) => setTourForm({ ...tourForm, tourcode: e.target.value })}
                required
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Tour Leader (TL) *</label>
                <Link
                  href="/settings"
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent-cyan)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  ⚙️ Manage TL List
                </Link>
              </div>
              <select
                className="form-input form-select"
                value={tourForm.tl}
                onChange={(e) => setTourForm({ ...tourForm, tl: e.target.value })}
                required
              >
                <option value="">— Select Tour Leader —</option>
                {tourLeaders.map((tl) => (
                  <option key={tl.id} value={tl.name}>
                    {tl.name} {tl.phone ? `(${tl.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-input"
                value={tourForm.start_date}
                onChange={(e) => setTourForm({ ...tourForm, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label">End Date *</label>
              <input
                type="date"
                className="form-input"
                value={tourForm.end_date}
                onChange={(e) => setTourForm({ ...tourForm, end_date: e.target.value })}
                required
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Drop-off Location / Hotel *</label>
              <input
                className="form-input"
                placeholder="e.g. Sri Phala Resort & Spa Sanur"
                value={tourForm.location}
                onChange={(e) => setTourForm({ ...tourForm, location: e.target.value })}
                required
              />
            </div>

            {/* ASSIGNED MODEMS MULTI-SELECT PILLS FROM INVENTORY */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Select Assigned Modems from Inventory ({tourForm.selectedModemSsids.length} selected)
                </label>
                <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                  Click to select / unselect
                </span>
              </div>

              {/* MODEM PILL GRID */}
              <div
                style={{
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-glass)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(85px, 1fr))",
                  gap: 6,
                }}
              >
                {[...modems]
                  .sort((a, b) => a.ssid.localeCompare(b.ssid, undefined, { numeric: true, sensitivity: "base" }))
                  .map((m) => {
                    const mcCode = m.ssid.replace("Media Creative ", "MC");
                    const isSelected = tourForm.selectedModemSsids.includes(mcCode);
                    const assignedTour = getAssignedTourForModem(m);
                    const isAssignedToThisTour = editingTourCode && assignedTour?.tourcode === editingTourCode;
                    const isAvailable = (m.status === "Available" && !assignedTour) || !!isAssignedToThisTour;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!isAvailable && !isSelected}
                        onClick={() => {
                          if (!isAvailable && !isSelected) return;
                          toggleModemSelectionInTour(mcCode);
                        }}
                        title={
                          !isAvailable
                            ? `Assigned / Unavailable (${assignedTour ? assignedTour.tourcode : m.remark || m.status})`
                            : `Available - Click to select ${mcCode}`
                        }
                        style={{
                          padding: "4px 6px",
                          borderRadius: 6,
                          border: `1px solid ${
                            isSelected
                              ? "var(--accent-cyan)"
                              : isAvailable
                              ? "var(--border)"
                              : "rgba(239, 68, 68, 0.25)"
                          }`,
                          background: isSelected
                            ? "var(--accent-cyan-dim)"
                            : isAvailable
                            ? "var(--bg-glass-hover)"
                            : "rgba(239, 68, 68, 0.05)",
                          color: isSelected
                            ? "var(--accent-cyan)"
                            : isAvailable
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                          fontSize: "0.72rem",
                          fontWeight: isSelected ? 800 : 500,
                          cursor: isAvailable || isSelected ? "pointer" : "not-allowed",
                          opacity: isAvailable || isSelected ? 1 : 0.45,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
                          {isSelected ? (
                            <Check size={11} style={{ color: "var(--accent-cyan)" }} />
                          ) : !isAvailable ? (
                            <span style={{ fontSize: "0.55rem", color: "#f87171", fontWeight: 700 }}>✕</span>
                          ) : null}
                          <span>{mcCode}</span>
                        </div>
                        <span style={{ fontSize: "0.6rem", opacity: 0.8, color: !isAvailable && !isSelected ? "#f87171" : undefined }}>
                          {!isAvailable && !isSelected
                            ? (assignedTour ? assignedTour.tourcode : m.status)
                            : m.device_name.replace("Orbitmifi_", "")}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* DYNAMIC PER-MODEM PAX NAME INPUT FIELDS */}
            {tourForm.selectedModemSsids.length > 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: "rgba(0,212,255,0.04)",
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--accent-cyan)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <User size={14} /> Assign Pax / Guest Name per Selected Modem:
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {tourForm.selectedModemSsids.map((mcCode) => (
                    <div key={mcCode} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label className="form-label" style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-primary)" }}>
                        Pax / Guest Name for <strong>{mcCode}</strong>
                      </label>
                      <input
                        className="form-input"
                        style={{ fontSize: "0.82rem", padding: "6px 10px" }}
                        placeholder={`e.g. Guest name for ${mcCode}...`}
                        value={tourForm.devicePaxMap[mcCode] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTourForm((prev) => ({
                            ...prev,
                            devicePaxMap: { ...prev.devicePaxMap, [mcCode]: val },
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="form-label">Tour Status</label>
              <select
                className="form-input form-select"
                value={tourForm.status}
                onChange={(e) => setTourForm({ ...tourForm, status: e.target.value as TourRentalLog["status"] })}
              >
                <option value="Running">Running (Active)</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Finish">Finish</option>
              </select>
            </div>

            <div>
              <label className="form-label">Invoice Status</label>
              <select
                className="form-input form-select"
                value={tourForm.invoice_status}
                onChange={(e) => setTourForm({ ...tourForm, invoice_status: e.target.value as TourRentalLog["invoice_status"] })}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b" }}>
                <FileText size={14} />
                NOTES
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Ketik catatan khusus / field note jika ada hal yang perlu dicatat..."
                value={tourForm.notes}
                onChange={(e) => setTourForm({ ...tourForm, notes: e.target.value })}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowTourModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTourCode ? <Edit2 size={14} /> : <Plus size={14} />}
              {editingTourCode ? "Save Tour Changes" : "Create Tour Rental Order"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD / EDIT PHYSICAL MODEM DEVICE */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingModem ? "Edit Modem Device" : "Add New Modem Wifi"}
      >
        <form onSubmit={handleSubmitDevice} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Device Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Orbitmifi_6DF6"
                value={form.device_name}
                onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">SIM Number *</label>
              <input
                className="form-input"
                placeholder="e.g. 081329926886"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Modem / SSID Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Media Creative 1"
                value={form.ssid}
                onChange={(e) => setForm({ ...form, ssid: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">WiFi Password *</label>
              <input
                className="form-input"
                placeholder="e.g. MC1#2026"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ModemItem["status"] })}
              >
                <option value="Available">Available</option>
                <option value="Rented">Rented</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="form-label">Remark / Notes</label>
              <input
                className="form-input"
                placeholder="Optional notes..."
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>
          </div>

          <div className="divider" style={{ margin: "4px 0" }} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={14} />
              {editingModem ? "Update Device" : "Save Modem Device"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}