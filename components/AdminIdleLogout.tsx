"use client";

import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;
const AUTH_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

export default function AdminIdleLogout() {
    const readyRef = useRef(false);
    const isAdminAuthenticatedRef = useRef(false);
    const lastActivityAtRef = useRef(Date.now());
    const loggingOutRef = useRef(false);

    useEffect(() => {
        const markActivity = () => {
            lastActivityAtRef.current = Date.now();
        };

        const syncAuthStatus = async () => {
            try {
                const res = await fetch("/api/admin/me", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = (await res.json()) as { authenticated?: boolean };
                isAdminAuthenticatedRef.current = Boolean(data.authenticated);
            } catch {
                isAdminAuthenticatedRef.current = false;
            } finally {
                readyRef.current = true;
            }
        };

        const logoutForInactivity = async () => {
            if (!readyRef.current || !isAdminAuthenticatedRef.current || loggingOutRef.current) {
                return;
            }

            const idleForMs = Date.now() - lastActivityAtRef.current;

            if (idleForMs < IDLE_TIMEOUT_MS) return;

            loggingOutRef.current = true;

            try {
                await fetch("/api/admin/logout", {
                    method: "POST",
                });
            } finally {
                window.location.assign("/admin/login?reason=idle");
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                markActivity();
                void syncAuthStatus();
            }
        };

        const activityEvents: Array<keyof WindowEventMap> = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
        ];

        markActivity();
        void syncAuthStatus();

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, markActivity, { passive: true });
        });

        document.addEventListener("visibilitychange", onVisibilityChange);

        const idleCheckId = window.setInterval(() => {
            void logoutForInactivity();
        }, IDLE_CHECK_INTERVAL_MS);

        const authRefreshId = window.setInterval(() => {
            void syncAuthStatus();
        }, AUTH_REFRESH_INTERVAL_MS);

        return () => {
            window.clearInterval(idleCheckId);
            window.clearInterval(authRefreshId);
            document.removeEventListener("visibilitychange", onVisibilityChange);

            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, markActivity);
            });
        };
    }, []);

    return null;
}
