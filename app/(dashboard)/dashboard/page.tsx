"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";

type KPIData = {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
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
  { label: "Add Client", href: "/clients", icon: Users, color: "#00d4ff" },
  { label: "New Invoice", href: "/invoices/new", icon: FileText, color: "#7c3aed" },
  { label: "Products", href: "/products", icon: TrendingUp, color: "#10b981" },
  { label: "Reports", href: "/reports", icon: Clock, color: "#f59e0b" },
];

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setQuoteIndex(randomIndex);

    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setKpi(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  function nextQuote() {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  }

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];

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
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
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