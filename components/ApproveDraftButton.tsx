"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveDraftButton({ invoiceId }: { invoiceId: number }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function approve() {
        setError("");
        setBusy(true);
        try {
            const response = await fetch(`/api/admin/invoices/${invoiceId}/approve`, { method: "POST" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to approve draft invoice.");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to approve draft invoice.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button type="button" onClick={approve} disabled={busy}
                className="rounded-full bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {busy ? "Approving..." : "Approve Draft"}
            </button>
            {error && <p role="alert" className="max-w-xs text-right text-xs font-medium text-red-700">{error}</p>}
        </div>
    );
}
