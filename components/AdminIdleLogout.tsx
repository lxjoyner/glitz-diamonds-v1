"use client";

import { useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_START_MS = 12 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 1000;
const AUTH_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

export default function AdminIdleLogout() {
    const readyRef = useRef(false);
    const isAdminAuthenticatedRef = useRef(false);
    const lastActivityAtRef = useRef(Date.now());
    const loggingOutRef = useRef(false);
    const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

    useEffect(() => {
        const markActivity = () => {
            lastActivityAtRef.current = Date.now();
            setCountdownSeconds((prev) => (prev === null ? prev : null));
        };

        const syncAuthStatus = async () => {
            try {
                const res = await fetch("/api/admin/me", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = (await res.json()) as { authenticated?: boolean };
                isAdminAuthenticatedRef.current = Boolean(data.authenticated);

                if (!isAdminAuthenticatedRef.current) {
                    setCountdownSeconds(null);
                }
            } catch {
                isAdminAuthenticatedRef.current = false;
                setCountdownSeconds(null);
            } finally {
                readyRef.current = true;
            }
        };

        const logoutForInactivity = async () => {
            if (!readyRef.current || !isAdminAuthenticatedRef.current || loggingOutRef.current) {
                return;
            }

            const idleForMs = Date.now() - lastActivityAtRef.current;
            const warningRemainingMs = IDLE_TIMEOUT_MS - idleForMs;

            if (idleForMs >= WARNING_START_MS && warningRemainingMs > 0) {
                setCountdownSeconds(Math.ceil(warningRemainingMs / 1000));
            } else if (idleForMs < WARNING_START_MS) {
                setCountdownSeconds((prev) => (prev === null ? prev : null));
            }

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

    if (countdownSeconds === null || !isAdminAuthenticatedRef.current) {
        return null;
    }

    const minutes = Math.floor(countdownSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (countdownSeconds % 60).toString().padStart(2, "0");

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 px-4">
            <div className="w-full max-w-md rounded-xl border border-red-400 bg-black/90 p-6 text-white shadow-2xl">
                <h2 className="text-xl font-semibold text-red-200">You are about to be logged out</h2>
                <p className="mt-3 text-sm text-red-50">
                    No activity has been detected for 12 minutes. For your security, your session will end after 15
                    minutes of inactivity.
                </p>
                <p className="mt-4 text-3xl font-bold tracking-wider text-red-100" aria-live="assertive">
                    {minutes}:{seconds}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        lastActivityAtRef.current = Date.now();
                        setCountdownSeconds(null);
                    }}
                    className="mt-5 inline-flex rounded-md bg-red-300 px-4 py-2 text-sm font-semibold text-black hover:bg-red-200"
                >
                    Stay signed in
                </button>
            </div>
        </div>
    );
}
