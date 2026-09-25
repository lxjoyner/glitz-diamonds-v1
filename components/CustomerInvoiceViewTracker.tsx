"use client";

import { useEffect } from "react";

/** A public invoice is counted as opened only after a browser renders it.
 * Next.js server prefetches and email security crawlers cannot trigger this.
 * Session storage reduces duplicate page-view pings in the same tab session;
 * the server still records only the first viewed timestamp separately.
 */
export default function CustomerInvoiceViewTracker({ token }: { token: string }) {
    useEffect(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        const key = "glitz:invoice-customer-view:" + token;
        try {
            if (sessionStorage.getItem(key)) return;
        } catch {
            // Disabled session storage should not prevent a real page view.
        }
        fetch("/api/invoice/" + encodeURIComponent(token) + "/customer-view", {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ viewed: true }),
        }).then((response) => {
            if (!response.ok) return;
            try { sessionStorage.setItem(key, "1"); } catch { /* storage disabled */ }
        }).catch(() => {
            // Network failures should allow a subsequent visit to retry.
        });
    }, [token]);
    return null;
}
