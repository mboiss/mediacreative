"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  BarChart2,
  Wifi,
  Plus,
  BellRing,
  CircleCheck,
  PlaneTakeoff,
  PlaneLanding,
  Wrench,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { StatusBadge, toneClasses, type Tone } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { daysFromToday, formatRupiah, formatRupiahCompact, formatShortDate } from "@/lib/format";

type MonthPair = { thisMonth: number; lastMonth: number };

type Attention = {
  unpaidInvoices: {
    id: string;
    invoice_number: string | null;
    client: string | null;
    amount: number;
    due_date: string | null;
    overdue: boolean;
  }[];
  unpaidTotal: number;
  toursStarting: { tourcode: string | null; tl: string | null; start: string; qty: number }[];
  toursEnding: { tourcode: string | null; tl: string | null; end: string; modems: string | null; overdue: boolean }[];
  maintenanceModems: { ssid: string | null; remark: string | null }[];
};

type KPIData = {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  pendingCount: number;
  revenueTrend: { month: string; revenue: number; invoices: number }[];
  modemStatus: Record<string, number>;
  monthOverMonth?: { revenue: MonthPair; invoices: MonthPair };
  attention?: Attention;
};

/** Chart colours come from theme tokens so both themes stay correct. */
const MODEM_STATUS_COLORS: Record<string, { fill: string; dot: string }> = {
  Available: { fill: "var(--success)", dot: "bg-success" },
  Rented: { fill: "var(--accent-cyan)", dot: "bg-accent" },
  Maintenance: { fill: "var(--warning)", dot: "bg-warning" },
};
const FALLBACK_STATUS_COLOR = { fill: "var(--neutral)", dot: "bg-neutral" };

const tooltipContentStyle = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  boxShadow: "var(--shadow-card)",
  color: "var(--text-primary)",
  fontSize: "0.8125rem",
};
const tooltipLabelStyle = { color: "var(--text-secondary)", fontWeight: 600 };
const tooltipItemStyle = { color: "var(--text-primary)" };

/** "↑ 12% vs last month" — success when up, danger when down. */
function Delta({ pair }: { pair: MonthPair | undefined }) {
  if (!pair) return null;
  const { thisMonth, lastMonth } = pair;
  if (lastMonth === 0) {
    if (thisMonth === 0) return <span className="text-fg-subtle">No activity last month</span>;
    return <span className="font-medium text-success">New vs last month</span>;
  }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (pct === 0) return <span className="text-fg-subtle">Same as last month</span>;
  const up = pct > 0;
  return (
    <span className={cn("font-medium", up ? "text-success" : "text-danger")}>
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      <span className="sr-only">{up ? "Up" : "Down"}</span> {Math.abs(pct)}% vs last month
    </span>
  );
}

/** "today", "tomorrow", "in 3 days", "2 days ago". */
function relativeDay(value: string | null | undefined): string {
  const d = daysFromToday(value);
  if (d === null) return "";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} days` : `${Math.abs(d)} days ago`;
}

function AttentionGroup({
  title,
  icon,
  tone,
  count,
  href,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone: Tone;
  count: number;
  href: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-line bg-inset">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <Link
          href={href}
          className="flex min-w-0 items-center gap-2 rounded-sm text-sm font-semibold text-fg hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border", toneClasses(tone))}>
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </Link>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
            count > 0 ? toneClasses(tone) : toneClasses("neutral")
          )}
          aria-label={`${count} ${count === 1 ? "item" : "items"}`}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="px-3 py-3 text-xs text-fg-subtle">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-line">{children}</ul>
      )}
    </div>
  );
}

const rowLinkClass =
  "flex items-start justify-between gap-3 px-3 py-2 text-sm transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

function NeedsAttention({ data, loading }: { data: Attention | undefined; loading: boolean }) {
  if (loading && !data) return <LoadingState label="Checking what needs attention..." />;
  if (!data) return <p className="text-sm text-fg-subtle">Attention items are unavailable right now.</p>;

  const total =
    data.unpaidTotal + data.toursStarting.length + data.toursEnding.length + data.maintenanceModems.length;

  if (total === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success-border bg-success-bg px-4 py-4">
        <CircleCheck className="size-6 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-fg">All clear</p>
          <p className="text-xs text-fg-muted">
            No unpaid invoices, no tours starting or ending soon, and no modems in maintenance.
          </p>
        </div>
      </div>
    );
  }

  const anyOverdue = data.unpaidInvoices.some((i) => i.overdue);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AttentionGroup
        title="Unpaid invoices"
        icon={<FileText className="size-4" aria-hidden />}
        tone={anyOverdue ? "danger" : "warning"}
        count={data.unpaidTotal}
        href="/invoices"
      >
        {data.unpaidInvoices.map((inv) => (
          <li key={inv.id}>
            <Link href={`/invoices/${inv.id}`} className={rowLinkClass}>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{inv.invoice_number || "Invoice"}</span>
                <span className="block truncate text-xs text-fg-subtle">{inv.client || "No client"}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-medium tabular-nums text-fg">{formatRupiah(inv.amount)}</span>
                <span className={cn("block text-xs", inv.overdue ? "font-medium text-danger" : "text-fg-subtle")}>
                  {inv.due_date
                    ? `${inv.overdue ? "Overdue" : "Due"} ${formatShortDate(inv.due_date)}`
                    : inv.overdue
                      ? "Overdue"
                      : "No due date"}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {data.unpaidTotal > data.unpaidInvoices.length && (
          <li>
            <Link href="/invoices" className={cn(rowLinkClass, "text-xs font-medium text-accent")}>
              View all {data.unpaidTotal} unpaid
            </Link>
          </li>
        )}
      </AttentionGroup>

      <AttentionGroup
        title="Tours starting soon"
        icon={<PlaneTakeoff className="size-4" aria-hidden />}
        tone="info"
        count={data.toursStarting.length}
        href="/rentals"
      >
        {data.toursStarting.map((t, i) => (
          <li key={`${t.tourcode}-${i}`}>
            <Link href={`/rentals?search=${encodeURIComponent(t.tourcode ?? "")}`} className={rowLinkClass}>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{t.tourcode || "Tour"}</span>
                <span className="block truncate text-xs text-fg-subtle">
                  {t.tl ? `TL ${t.tl}` : "No TL"} · {t.qty} {t.qty === 1 ? "modem" : "modems"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-medium text-fg">{formatShortDate(t.start)}</span>
                <span className="block text-xs text-fg-subtle">{relativeDay(t.start)}</span>
              </span>
            </Link>
          </li>
        ))}
      </AttentionGroup>

      <AttentionGroup
        title="Tours ending / modem returns"
        icon={<PlaneLanding className="size-4" aria-hidden />}
        tone={data.toursEnding.some((t) => t.overdue) ? "danger" : "accent"}
        count={data.toursEnding.length}
        href="/rentals"
      >
        {data.toursEnding.map((t, i) => (
          <li key={`${t.tourcode}-${i}`}>
            <Link href={`/rentals?search=${encodeURIComponent(t.tourcode ?? "")}`} className={rowLinkClass}>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{t.tourcode || "Tour"}</span>
                <span className="block truncate text-xs text-fg-subtle">
                  {[t.tl ? `TL ${t.tl}` : null, t.modems].filter(Boolean).join(" · ") || "No details"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-medium text-fg">{formatShortDate(t.end)}</span>
                <span className={cn("block text-xs", t.overdue ? "font-medium text-danger" : "text-fg-subtle")}>
                  {t.overdue ? `Ended ${relativeDay(t.end)}` : `Ends ${relativeDay(t.end)}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </AttentionGroup>

      <AttentionGroup
        title="Modems in maintenance"
        icon={<Wrench className="size-4" aria-hidden />}
        tone="warning"
        count={data.maintenanceModems.length}
        href="/rentals"
      >
        {data.maintenanceModems.map((m, i) => (
          <li key={`${m.ssid}-${i}`}>
            <Link href="/rentals" className={rowLinkClass}>
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">{m.ssid || "Unnamed modem"}</span>
                <span className="block truncate text-xs text-fg-subtle">{m.remark || "No remark"}</span>
              </span>
              <StatusBadge status="Maintenance" className="shrink-0" />
            </Link>
          </li>
        ))}
      </AttentionGroup>
    </div>
  );
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState("");

  const loadDashboardData = useCallback(() => {
    fetch(`/api/dashboard?_t=${Date.now()}`, { cache: "no-store", headers: { Pragma: "no-cache" } })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load dashboard data");
        setKpi(data);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Computed on the client to avoid a server/client timezone mismatch.
    setToday(
      new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    );
    loadDashboardData();
  }, [loadDashboardData]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadDashboardData, { tables: ["invoices", "clients", "modems", "tour_rental_logs"] });

  const modemSlices = Object.entries(kpi?.modemStatus ?? {}).map(([name, value]) => {
    const colors = MODEM_STATUS_COLORS[name] ?? FALLBACK_STATUS_COLOR;
    return { name, value, color: colors.fill, dot: colors.dot };
  });

  const pendingCount = kpi?.pendingCount ?? 0;
  const mom = kpi?.monthOverMonth;
  const attention = kpi?.attention;
  const attentionCount = attention
    ? attention.unpaidTotal +
      attention.toursStarting.length +
      attention.toursEnding.length +
      attention.maintenanceModems.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* WELCOME HEADER */}
      <PageHeader
        title="Welcome back, Media Creative"
        description={
          today
            ? `${today} · Here's what's happening with your business today.`
            : "Here's what's happening with your business today."
        }
        actions={
          <>
            <Link href="/rentals" className="btn btn-ghost">
              <Plus size={16} aria-hidden />
              New Tour
            </Link>
            <Link href="/invoices/new" className="btn btn-primary">
              <Plus size={16} aria-hidden />
              New Invoice
            </Link>
          </>
        }
      />

      {loadError && !kpi && (
        <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          {loadError}
        </p>
      )}

      {/* KPI CARDS */}
      <StatGrid>
        <StatCard
          label="Total Clients"
          value={String(kpi?.totalClients ?? 0)}
          icon={<Users className="size-5" />}
          tone="accent"
          href="/clients"
          loading={loading}
        />
        <StatCard
          label="Total Invoices"
          value={String(kpi?.totalInvoices ?? 0)}
          icon={<FileText className="size-5" />}
          tone="purple"
          hint={
            mom ? (
              <span className="flex flex-col gap-0.5">
                <span>{mom.invoices.thisMonth} issued this month</span>
                <Delta pair={mom.invoices} />
              </span>
            ) : undefined
          }
          href="/invoices"
          loading={loading}
        />
        <StatCard
          label="Revenue (Paid)"
          value={formatRupiahCompact(kpi?.totalRevenue ?? 0)}
          icon={<TrendingUp className="size-5" />}
          tone="success"
          hint={
            mom ? (
              <span className="flex flex-col gap-0.5">
                <span>{formatRupiahCompact(mom.revenue.thisMonth)} this month</span>
                <Delta pair={mom.revenue} />
              </span>
            ) : undefined
          }
          href="/invoices"
          loading={loading}
        />
        <StatCard
          label="Pending Amount"
          value={formatRupiahCompact(kpi?.pendingAmount ?? 0)}
          icon={<Clock className="size-5" />}
          tone="warning"
          hint={kpi ? `${pendingCount} ${pendingCount === 1 ? "invoice" : "invoices"}` : undefined}
          href="/invoices"
          loading={loading}
        />
      </StatGrid>

      {/* NEEDS ATTENTION */}
      <Panel
        title="Needs attention"
        description="Unpaid invoices, tours starting in 7 days, tours ending in 3 days and modems in maintenance"
        icon={<BellRing className="size-[18px]" />}
        actions={
          attention && attentionCount > 0 ? (
            <StatusBadge tone="warning">
              {attentionCount} {attentionCount === 1 ? "item" : "items"}
            </StatusBadge>
          ) : undefined
        }
      >
        <NeedsAttention data={attention} loading={loading} />
      </Panel>

      {/* ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-5">
        {/* REVENUE TREND */}
        <Panel
          className="lg:col-span-3"
          title="Paid Revenue Trend"
          description="Paid invoice revenue by issue month, last 6 months"
          icon={<BarChart2 className="size-[18px]" />}
        >
          <div className="h-[220px] w-full sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi?.revenueTrend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  stroke="var(--text-muted)"
                  tick={{ fill: "var(--text-muted)" }}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fill: "var(--text-muted)" }}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  width={72}
                  tickFormatter={(v: number) => formatRupiahCompact(v)}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: "var(--border-strong)" }}
                  formatter={(value) => [formatRupiah(Number(value)), "Paid revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2.5}
                  fill="var(--accent-cyan)"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* MODEM INVENTORY DISTRIBUTION */}
        <Panel
          className="lg:col-span-2"
          title="Modem WiFi Allocation"
          description="Active deployment ratio across Orbit Mifi units"
          icon={<Wifi className="size-[18px]" />}
        >
          <div className="flex h-[200px] w-full items-center justify-center">
            {modemSlices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modemSlices}
                    isAnimationActive={false}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="var(--bg-secondary)"
                  >
                    {modemSlices.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              !loading && <p className="text-sm text-fg-subtle">No modem data yet.</p>
            )}
          </div>

          {modemSlices.length > 0 && (
            <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-line pt-3">
              {modemSlices.map((slice) => (
                <li key={slice.name} className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <span aria-hidden className={cn("size-2 rounded-full", slice.dot)} />
                  {slice.name} <span className="font-semibold text-fg">({slice.value})</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
