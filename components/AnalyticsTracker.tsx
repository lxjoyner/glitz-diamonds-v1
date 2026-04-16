"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const key = `visit-tracked-${pathname}-${new Date().toISOString().slice(0, 10)}`;

        if (sessionStorage.getItem(key)) {
            return;
        }

        fetch("/api/track-visit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: pathname }),
        }).catch((err) => {
            console.error("Visit tracking failed:", err);
        });

        sessionStorage.setItem(key, "true");
    }, [pathname]);

    return null;
}