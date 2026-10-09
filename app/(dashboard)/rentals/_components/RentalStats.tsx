import { CheckCircle2, FileText, Radio, Wifi } from "lucide-react";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import type { ModemItem, TourRentalLog } from "../_lib/types";

export function RentalStats({
  modems,
  tourLogs,
  loading,
}: {
  modems: ModemItem[];
  tourLogs: TourRentalLog[];
  loading: boolean;
}) {
  const totalAvailable = modems.filter((m) => m.status === "Available").length;
  const totalRented = modems.filter((m) => m.status === "Rented").length;
  const activeTours = tourLogs.filter((t) => t.status === "Running" || t.status === "Upcoming").length;

  return (
    <StatGrid>
      <StatCard label="Total inventory" value={modems.length} hint="modems" icon={<Wifi size={18} />} tone="accent" loading={loading} />
      <StatCard label="Available" value={totalAvailable} hint="units in stock" icon={<CheckCircle2 size={18} />} tone="success" loading={loading} />
      <StatCard label="Deployed" value={totalRented} hint="units rented out" icon={<Radio size={18} />} tone="info" loading={loading} />
      <StatCard label="Active tours" value={activeTours} hint="running or upcoming" icon={<FileText size={18} />} tone="warning" loading={loading} />
    </StatGrid>
  );
}
