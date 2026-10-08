import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading data..." }: { label?: string }) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "60px 32px",
        color: "var(--text-secondary)",
        fontSize: "0.9rem",
      }}
    >
      <style>{`@keyframes loadingSpin { to { transform: rotate(360deg); } }`}</style>
      <Loader2 size={18} style={{ animation: "loadingSpin 0.9s linear infinite" }} />
      {label}
    </div>
  );
}
