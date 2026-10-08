"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Loader2,
  Sparkles,
  RotateCw,
  BarChart2,
  PieChart as PieIcon,
  Wifi,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type KPIData = {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  pendingCount: number;
  revenueTrend: { month: string; revenue: number; invoices: number }[];
  modemStatus: Record<string, number>;
};

const MODEM_STATUS_COLORS: Record<string, string> = {
  Available: "#10b981",
  Rented: "#00d4ff",
  Maintenance: "#f59e0b",
};

const MOTIVATIONAL_QUOTES = [
  {
    quote: "Kesuksesan bisnis bukan tentang seberapa cepat Anda memulai, melainkan seberapa konsisten Anda melayani.",
    author: "Media Creative Wisdom",
  },
  {
    quote: "Focus on building great relationships with your clients; sustainable growth will naturally follow.",
    author: "Business Excellence",
  },
  {
    quote: "Setiap invoice yang Anda terbitkan adalah bukti nyata kerja keras dan pertumbuhan usaha Anda.",
    author: "Media Creative Control Center",
  },
  {
    quote: "Kualitas pelayanan hari ini adalah fondasi reputasi terbaik bisnis Anda di masa depan.",
    author: "Growth Mindset",
  },
  {
    quote: "Great things in business are never done by one person. They're done by a team of dedicated people.",
    author: "Steve Jobs",
  },
  {
    quote: "Peluang besar selalu hadir di balik penyelesaian masalah-masalah kecil dengan penuh integritas.",
    author: "Inspiring Growth",
  },
  {
    quote: "Inovasi dan pelayanan terbaik adalah pembeda utama antara bisnis biasa dan bisnis luar biasa.",
    author: "Leadership Motto",
  },
  {
    quote: "Disiplin dan konsistensi harian adalah kunci utama mengubah visi besar menjadi kenyataan.",
    author: "Entrepreneur Guide",
  },
];

function formatCurrency(amount: number) {
  if (amount >= 1_000_000) {
    return "Rp " + (amount / 1_000_000).toFixed(1) + "jt";
  }
  return "Rp " + amount.toLocaleString("id-ID");
}

const quickLinks = [
  { label: "Add Client", href: "/clients?new=1", icon: Users, color: "#00d4ff" },
  { label: "New Invoice", href: "/invoices/new", icon: FileText, color: "#7c3aed" },
  { label: "Products", href: "/products", icon: TrendingUp, color: "#10b981" },
  { label: "Reports", href: "/reports", icon: Clock, color: "#f59e0b" },
];

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);

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
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setQuoteIndex(randomIndex);
    loadDashboardData();
  }, [loadDashboardData]);

  // Enable Real-time sync across devices
  useRealtimeSync(loadDashboardData, { tables: ["invoices", "clients", "modems", "tour_rental_logs"] });

  function nextQuote() {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  }

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];

  const modemSlices = Object.entries(kpi?.modemStatus ?? {}).map(([name, value]) => ({
    name,
    value,
    color: MODEM_STATUS_COLORS[name] ?? "#94a3b8",
  }));

  const cards = [
    {
      title: "Total Clients",
      value: loading ? "..." : String(kpi?.totalClients ?? 0),
      icon: Users,
      color: "#00d4ff",
      gradient: "linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,212,255,0.04))",
      border: "rgba(0,212,255,0.2)",
      href: "/clients",
    },
    {
      title: "Total Invoices",
      value: loading ? "..." : String(kpi?.totalInvoices ?? 0),
      icon: FileText,
      color: "#7c3aed",
      gradient: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(124,58,237,0.04))",
      border: "rgba(124,58,237,0.2)",
      href: "/invoices",
    },
    {
      title: "Revenue (Paid)",
      value: loading ? "..." : formatCurrency(kpi?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: "#10b981",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))",
      border: "rgba(16,185,129,0.2)",
      href: "/invoices",
    },
    {
      title: "Pending Amount",
      value: loading ? "..." : formatCurrency(kpi?.pendingAmount ?? 0),
      icon: Clock,
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))",
      border: "rgba(245,158,11,0.2)",
      href: "/invoices",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* WELCOME BANNER */}
      <div
        className="animate-fade-in-up"
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "24px 32px",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(0, 212, 255, 0.06)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back, Media Creative 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
            Here's what's happening with your business today.
          </p>
        </div>

        {/* RANDOM MOTIVATIONAL QUOTE CARD */}
        <div
          className="quote-card-container"
          style={{
            flex: 1,
            minWidth: 260,
            maxWidth: 440,
            background: "rgba(0, 212, 255, 0.05)",
            border: "1px solid rgba(0, 212, 255, 0.18)",
            borderRadius: 16,
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            position: "relative",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              <Sparkles size={13} /> Motivation & Insight
            </div>
            <button
              onClick={nextQuote}
              title="Acak Kata Motivasi Bisnis"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: "0.7rem",
                borderRadius: 6,
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-cyan)";
                e.currentTarget.style.background = "rgba(0,212,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <RotateCw size={12} />
              <span>Acak</span>
            </button>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontStyle: "italic", margin: 0, lineHeight: 1.45 }}>
            "{currentQuote.quote}"
          </p>
          <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", textAlign: "right", fontWeight: 600 }}>
            — {currentQuote.author}
          </span>
        </div>

        <div>
          <Image
            src="/logo.png"
            alt="Media Creative Logo"
            width={160}
            height={52}
            style={{ objectFit: "contain", width: "150px", height: "auto" }}
            priority
          />
        </div>
      </div>

      {/* KPI CARDS */}
      <div
        className="stagger-children"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              style={{ textDecoration: "none" }}
            >
              <div
                className="glass-card-hover"
                style={{
                  background: "var(--bg-glass)",
                  border: `1px solid var(--border)`,
                  borderRadius: 20,
                  padding: "20px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `${card.color}18`,
                      border: `1px solid ${card.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                  <ArrowRight size={14} style={{ color: "var(--text-muted)", marginTop: 4 }} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  {card.title}
                </div>
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {loading ? (
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: card.color }} />
                  ) : (
                    card.value
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* INTERACTIVE ANALYTICS CHARTS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 20 }}>
        {/* REVENUE & INVOICING TREND CHART */}
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart2 size={18} style={{ color: "#00d4ff" }} />
                Paid Revenue Trend
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                Paid invoice revenue by issue month, last 6 months
              </p>
            </div>
          </div>

          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={kpi?.revenueTrend ?? []}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}jt` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    color: "#fff",
                    fontSize: "0.8rem",
                  }}
                  formatter={(value) => ["Rp " + Number(value).toLocaleString("id-ID"), "Paid revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MODEM INVENTORY DISTRIBUTION CHART */}
        <div
          style={{
            background: "var(--bg-glass)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Wifi size={18} style={{ color: "#10b981" }} />
              Modem WiFi Allocation
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Active deployment ratio across Orbit Mifi units
            </p>
          </div>

          <div style={{ width: "100%", height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {modemSlices.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modemSlices}
                  isAnimationActive={false}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modemSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: "0.8rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
            {modemSlices.map((slice) => (
              <div key={slice.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: slice.color }} />
                {slice.name} ({slice.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "24px",
        }}
      >
        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
          Quick Actions
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-glass)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${link.color}15`;
                    e.currentTarget.style.borderColor = `${link.color}40`;
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-glass)";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Icon size={16} style={{ color: link.color, flexShrink: 0 }} />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}