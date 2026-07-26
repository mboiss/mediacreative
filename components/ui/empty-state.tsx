import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 32px",
        textAlign: "center",
        gap: 16,
      }}
    >
      {icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "rgba(0, 212, 255, 0.06)",
            border: "1px solid rgba(0, 212, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(0, 212, 255, 0.5)",
            marginBottom: 4,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <p
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          {title}
        </p>
        {description && (
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
