"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Users, FileText, TrendingUp, Clock, BarChart2, Wifi, Zap } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { toneClasses } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type KPIData = {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  pendingCount: number;
  revenueTrend: { month: string; revenue: number; invoices: number }[];
  modemStatus: Record<string, number>;
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

function formatCurrency(amount: number) {
  if (amount >= 1_000_000) {
    return "Rp " + (amount / 1_000_000).toFixed(1) + "jt";
  }
  return "Rp " + amount.toLocaleString("id-ID");
}

const quickLinks = [
  { label: "Add Client", href: "/clients?new=1", icon: Users, tone: "accent" as const },
  { label: "New Invoice", href: "/invoices/new", icon: FileText, tone: "purple" as const },
  { label: "Products", href: "/products", icon: TrendingUp, tone: "success" as const },
  { label: "Reports", href: "/reports", icon: Clock, tone: "warning" as const },
];

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState("");

  const loadDashboardData = useCallback(() => {
    fetch(`/api/dashboard?_t=${Date.now()}`, { cache: "no-store", headers: { Pragma: "no-cache" } })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load dashboard data");
        setKpi(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
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

  return (
    <div className="flex flex-col gap-6">
      {/* WELCOME HEADER */}
      <PageHeader
        title="Welcome back, Media Creative"
        description={today ? `${today} · Here's what's happening with your business today.` : "Here's what's happening with your business today."}
      />

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
          href="/invoices"
          loading={loading}
        />
        <StatCard
          label="Revenue (Paid)"
          value={formatCurrency(kpi?.totalRevenue ?? 0)}
          icon={<TrendingUp className="size-5" />}
          tone="success"
          href="/invoices"
          loading={loading}
        />
        <StatCard
          label="Pending Amount"
          value={formatCurrency(kpi?.pendingAmount ?? 0)}
          icon={<Clock className="size-5" />}
          tone="warning"
          hint={kpi ? `${pendingCount} ${pendingCount === 1 ? "invoice" : "invoices"}` : undefined}
          href="/invoices"
          loading={loading}
        />
      </StatGrid>

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
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  width={44}
                  tickFormatter={(v: number) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}jt` : String(v))}
                />
                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: "var(--border-strong)" }}
                  formatter={(value) => ["Rp " + Number(value).toLocaleString("id-ID"), "Paid revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent-cyan)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRev)"
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
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
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

      {/* QUICK ACTIONS */}
      <Panel title="Quick Actions" icon={<Zap className="size-[18px]" />}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border border-line bg-inset px-3 py-3 text-sm font-semibold text-fg-muted transition hover:-translate-y-0.5 hover:border-line-accent hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent sm:px-4"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                    toneClasses(link.tone)
                  )}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <span className="min-w-0 truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
