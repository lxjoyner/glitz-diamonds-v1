"use client";

import { useState } from "react";

export default function InvoicePayButton({ token, disabled = false }: { token: string; disabled?: boolean }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function startPayment() {
        if (disabled || loading) return;
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`/api/invoice/${encodeURIComponent(token)}/checkout`, { method: "POST" });
            const data = await response.json();
            if (!response.ok || !data?.checkoutUrl) {
                throw new Error(data?.error || "Unable to start payment.");
            }
            window.location.href = data.checkoutUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to start payment.");
            setLoading(false);
        }
    }

    return (
        <div className="mt-6">
            <button
                type="button"
                onClick={startPayment}
                disabled={disabled || loading}
                className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? "Redirecting to secure checkout..." : "Pay Invoice"}
            </button>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
    );
}
