"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, ExternalLink, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { exportToCSV } from "@/lib/export-utils";
import { useRentalsData } from "./_lib/useRentalsData";
import {
  filterAndSortModems,
  filterAndSortTours,
  findModemByCode,
  formatDateDisplay,
  formatDateForInput,
  getAssignedTourForModem,
} from "./_lib/helpers";
import type {
  DateSortOrder,
  ModemFormState,
  ModemItem,
  ModemSortField,
  RentalTab,
  SortOrder,
  TourFormState,
  TourRentalLog,
} from "./_lib/types";
import { RentalTabs } from "./_components/RentalTabs";
import { RentalStats } from "./_components/RentalStats";
import { ModemFilters } from "./_components/ModemFilters";
import { TourFilters } from "./_components/TourFilters";
import { ModemInventoryTable } from "./_components/ModemInventoryTable";
import { TourLogTable } from "./_components/TourLogTable";
import { TourDetailModal } from "./_components/TourDetailModal";
import { TourFormModal } from "./_components/TourFormModal";
import { ModemFormModal } from "./_components/ModemFormModal";

const EMPTY_TOUR_FORM: TourFormState = {
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
};

/** Applies `?search=` (e.g. from the Ctrl+K palette or dashboard links) to the tour search box. */
function SearchParamSync({ onSearch }: { onSearch: (q: string) => void }) {
  const q = useSearchParams().get("search");
  useEffect(() => {
    if (q) onSearch(q);
    // onSearch is recreated each render; only react to the URL value changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return null;
}

export default function ModemWifiPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { modems, setModems, tourLogs, setTourLogs, tourLeaders, loading, loadData } = useRentalsData();
  const [activeTab, setActiveTab] = useState<RentalTab>("tours");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [tourStatusFilter, setTourStatusFilter] = useState<string>("All");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("All");
  const [dateSortOrder, setDateSortOrder] = useState<DateSortOrder>("newest");

  const [modemSortField, setModemSortField] = useState<ModemSortField>("ssid");
  const [modemSortOrder, setModemSortOrder] = useState<SortOrder>("asc");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);
  const [selectedTourDetail, setSelectedTourDetail] = useState<TourRentalLog | null>(null);

  const [editingModem, setEditingModem] = useState<ModemItem | null>(null);
  const [editingTourCode, setEditingTourCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State: Add/Edit Modem Device
  const [form, setForm] = useState<ModemFormState>({
    device_name: "",
    number: "",
    ssid: "",
    password: "",
    status: "Available",
    remark: "",
  });

  // Form State: New Tour / Rental Order
  const [tourForm, setTourForm] = useState<TourFormState>(EMPTY_TOUR_FORM);

  // 1-CLICK WHATSAPP DISPATCHER
  function handleWhatsAppShare(tour: TourRentalLog) {
    const assignedList = tour.modems.split(",").map((s) => s.trim()).filter(Boolean);

    // Build modem wifi details text
    const modemDetails = assignedList
      .map((mcCode) => {
        const match = findModemByCode(modems, mcCode);
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
    setTourForm({ ...EMPTY_TOUR_FORM, selectedModemSsids: [], devicePaxMap: {} });
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
    const matchingModem = findModemByCode(modems, ssidLabel);
    const assignedTour = matchingModem ? getAssignedTourForModem(matchingModem, tourLogs) : undefined;
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
      .filter(([, pax]) => pax.trim().length > 0)
      .map(([, pax]) => `${pax.trim()}`);
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

  async function updateTourNotes(tourcode: string, newNotes: string): Promise<boolean> {
    try {
      const res = await fetch("/api/tour-rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourcode, notes: newNotes }),
      });
      if (!res.ok) {
        toast.error("Notes not saved", `Could not save notes for ${tourcode}`);
        return false;
      }
      await loadData();
      setSelectedTourDetail((prev) => (prev && prev.tourcode === tourcode ? { ...prev, notes: newNotes } : prev));
      return true;
    } catch (err) {
      console.error(err);
      return false;
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

  const filteredModems = filterAndSortModems(modems, search, statusFilter, modemSortField, modemSortOrder);
  const filteredTours = filterAndSortTours(tourLogs, search, tourStatusFilter, invoiceStatusFilter, dateSortOrder);

  const tourPagination = usePagination(filteredTours, [search, tourStatusFilter, invoiceStatusFilter, dateSortOrder].join("|"));

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <SearchParamSync
          onSearch={(q) => {
            setSearch(q);
            setActiveTab("tours");
          }}
        />
      </Suspense>
      <PageHeader
        title="Modem WiFi & Tour Rentals"
        meta={<StatusBadge tone="accent">{modems.length} devices</StatusBadge>}
        description="Orbit Mifi inventory, WiFi passwords, tour deployments and Tour Leader allocations."
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={activeTab === "tours" ? handleExportTours : handleExportModems}
              title={`Export ${activeTab === "tours" ? "tour logs" : "modem inventory"} as CSV`}
            >
              <Download size={15} aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={handleOpenNewTour}>
              <Plus size={16} aria-hidden />
              New Tour
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleOpenAdd}>
              <Plus size={16} aria-hidden />
              Add Modem
            </button>
            {/* MYORBIT TOP-UP SHORTCUT */}
            <a
              href="https://www.myorbit.id/dashboard-devices"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost no-underline"
              title="Open MyOrbit dashboard in a new tab to top up modem quota"
            >
              <ExternalLink size={15} className="text-warning" aria-hidden />
              MyOrbit Top-up
            </a>
          </>
        }
      />

      <RentalStats modems={modems} tourLogs={tourLogs} loading={loading} />

      <RentalTabs activeTab={activeTab} onChange={setActiveTab} tourCount={tourLogs.length} modemCount={modems.length} />

      {/* TAB 1: DEVICES INVENTORY */}
      {activeTab === "inventory" && (
        <div role="tabpanel" id="rentals-panel-inventory" aria-labelledby="rentals-tab-inventory">
          <Panel padded={false}>
            <div className="border-b border-line p-4">
              <ModemFilters
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortField={modemSortField}
                sortOrder={modemSortOrder}
                onSortChange={(field, order) => {
                  setModemSortField(field);
                  setModemSortOrder(order);
                }}
                onClear={() => {
                  setSearch("");
                  setStatusFilter("All");
                  setModemSortField("ssid");
                  setModemSortOrder("asc");
                }}
              />
            </div>
            <ModemInventoryTable
              loading={loading}
              modems={filteredModems}
              tourLogs={tourLogs}
              isFiltered={!!search || statusFilter !== "All"}
              sortField={modemSortField}
              sortOrder={modemSortOrder}
              onSort={handleModemSort}
              copiedId={copiedId}
              onCopy={handleCopy}
              onViewTour={setSelectedTourDetail}
              onToggleStatus={toggleDeviceStatus}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteDevice}
              onAdd={handleOpenAdd}
            />
          </Panel>
        </div>
      )}

      {/* TAB 2: TOUR TRACKING LOG */}
      {activeTab === "tours" && (
        <div role="tabpanel" id="rentals-panel-tours" aria-labelledby="rentals-tab-tours">
          <Panel padded={false}>
            <div className="border-b border-line p-4">
              <TourFilters
                search={search}
                onSearchChange={setSearch}
                tourStatusFilter={tourStatusFilter}
                onTourStatusFilterChange={setTourStatusFilter}
                invoiceStatusFilter={invoiceStatusFilter}
                onInvoiceStatusFilterChange={setInvoiceStatusFilter}
                dateSortOrder={dateSortOrder}
                onDateSortOrderChange={setDateSortOrder}
                onClear={() => {
                  setSearch("");
                  setTourStatusFilter("All");
                  setInvoiceStatusFilter("All");
                  setDateSortOrder("newest");
                }}
              />
            </div>
            <TourLogTable
              loading={loading}
              totalFiltered={filteredTours.length}
              tours={tourPagination.pageItems}
              dateSortOrder={dateSortOrder}
              onToggleDateSort={() => setDateSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              onView={setSelectedTourDetail}
              onWhatsApp={handleWhatsAppShare}
              onEdit={handleOpenEditTour}
              onToggleFinish={toggleTourStatus}
              onDelete={handleDeleteTour}
              onStatusChange={updateTourStatus}
              onInvoiceStatusChange={updateTourInvoiceStatus}
              onNewTour={handleOpenNewTour}
            />
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
          </Panel>
        </div>
      )}

      {/* POPUP MODAL: TOUR DETAILS & ASSIGNED MODEMS */}
      {selectedTourDetail && (
        <TourDetailModal
          key={selectedTourDetail.tourcode}
          tour={selectedTourDetail}
          modems={modems}
          copiedId={copiedId}
          onCopy={handleCopy}
          onClose={() => setSelectedTourDetail(null)}
          onStatusChange={updateTourStatus}
          onInvoiceStatusChange={updateTourInvoiceStatus}
          onNotesChange={updateTourNotes}
          onToggleFinish={toggleTourStatus}
          onEdit={handleOpenEditTour}
        />
      )}

      {/* NEW / EDIT TOUR RENTAL ORDER */}
      <TourFormModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        editingTourCode={editingTourCode}
        tourForm={tourForm}
        setTourForm={setTourForm}
        modems={modems}
        tourLogs={tourLogs}
        tourLeaders={tourLeaders}
        onToggleModem={toggleModemSelectionInTour}
        onSubmit={handleSaveNewTour}
      />

      {/* ADD / EDIT PHYSICAL MODEM DEVICE */}
      <ModemFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isEditing={!!editingModem}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmitDevice}
      />
    </div>
  );
}
