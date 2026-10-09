import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading data..." }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 px-6 py-14 text-sm text-fg-muted">
      <Loader2 size={18} className="animate-spin text-accent" aria-hidden />
      {label}
    </div>
  );
}
