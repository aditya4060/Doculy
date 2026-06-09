import type { DocumentStatus } from "@/types/doculy";

const styles: Record<DocumentStatus, string> = {
  processing: "border-amber-300 bg-amber-50 text-amber-800",
  ready: "border-emerald-300 bg-emerald-50 text-emerald-800",
  failed: "border-rose-300 bg-rose-50 text-rose-800"
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
