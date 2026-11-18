"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GUIDED_TOURS, permittedTours, type GuidedTour } from "@/lib/guided-tours";

type HelpAvailability = "loading" | "allowed" | "hidden";
type AnchorRect = { top: number; left: number; width: number; height: number };

export default function GuidedHelpProvider() {
    const pathname = usePathname();
    const [availability, setAvailability] = useState<HelpAvailability>("loading");
    const [role, setRole] = useState("");
    const [tour, setTour] = useState<GuidedTour | null>(null);
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<AnchorRect | null>(null);
    const [missing, setMissing] = useState(false);
    const [chooserOpen, setChooserOpen] = useState(false);

    const closeTour = useCallback(() => {
        setTour(null);
        setRect(null);
        setMissing(false);
    }, []);

    // Only the server-validated Help topic response can enable a tour.
    useEffect(() => {
        let active = true;
        const potential = GUIDED_TOURS.some((item) => item.path === pathname);
        if (!potential) return;
        fetch("/api/help/topics", { cache: "no-store" })
            .then(async (response) => {
                if (!active) return;
                if (!response.ok) { setAvailability("hidden"); return; }
                const data = await response.json();
                if (!active) return;
                if (!data.success || !data.helpEnabled || !Array.isArray(data.topics)) {
                    setAvailability("hidden");
                    return;
                }
                setRole(data.role);
                setAvailability("allowed");
            })
            .catch(() => { if (active) setAvailability("hidden"); });
        return () => { active = false; };
    }, [pathname]);

    const availableTours = availability === "allowed" ? permittedTours(role, pathname) : [];
    const begin = useCallback((next: GuidedTour) => {
        setChooserOpen(false);
        setMissing(false);
        setStep(0);
        setTour(next);
    }, []);

    // From Help Center: /admin/invoices?tour=invoice-dashboard-overview
    useEffect(() => {
        if (availability !== "allowed" || !pathname) return;
        const params = new URLSearchParams(window.location.search);
        const requested = params.get("tour");
        if (!requested) return;
        const match = permittedTours(role, pathname).find((item) => item.id === requested);
        if (match) begin(match);
        params.delete("tour");
        const query = params.toString();
        window.history.replaceState(window.history.state, "", pathname + (query ? "?" + query : "") + window.location.hash);
    }, [availability, role, pathname, begin]);

    // Closing on navigation prevents stale anchors or cross-role leakage.
    useEffect(() => {
        return () => { closeTour(); };
    }, [pathname, closeTour]);

    useEffect(() => {
        if (!tour) return;
        const current = tour.steps[step];
        let anchor: Element | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let frame = 0;
        const position = () => {
            anchor = document.querySelector(current.selector);
            if (!anchor) { setRect(null); setMissing(true); return; }
            const bounds = anchor.getBoundingClientRect();
            const visible = bounds.width > 0 && bounds.height > 0;
            setMissing(!visible);
            setRect(visible ? { top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height } : null);
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
        const moveToAnchor = () => {
            const element = document.querySelector(current.selector);
            if (element) element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            schedule();
        };
        moveToAnchor();
        const t = window.setTimeout(moveToAnchor, 200);
        const element = document.querySelector(current.selector);
        if (element && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(schedule);
            resizeObserver.observe(element);
        }
        window.addEventListener("resize", schedule);
        window.addEventListener("scroll", schedule, true);
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeTour(); };
        window.addEventListener("keydown", escape);
        return () => {
            window.clearTimeout(t);
            cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", schedule);
            window.removeEventListener("scroll", schedule, true);
            window.removeEventListener("keydown", escape);
        };
    }, [tour, step, closeTour]);

    if (availableTours.length === 0 && !tour) return null;
    const current = tour?.steps[step];
    const popoverTop = rect ? Math.max(12, Math.min(windowSafeHeight() - 230, rect.top + rect.height + 14)) : 70;
    const popoverLeft = rect ? Math.max(12, Math.min(windowSafeWidth() - 340, rect.left)) : 12;

    return (
        <>
            {!tour && availableTours.length > 0 && (
                <div className="fixed bottom-5 right-5 z-[80]">
                    <button type="button" onClick={() => setChooserOpen((value) => !value)}
                        aria-expanded={chooserOpen} aria-controls="guided-help-chooser"
                        className="rounded-full border border-white/30 bg-red-800 px-5 py-3 font-semibold text-white shadow-xl hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                        Show Me How
                    </button>
                    {chooserOpen && (
                        <div id="guided-help-chooser" className="absolute bottom-16 right-0 w-72 rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-2xl">
                            <p className="mb-2 font-semibold">Interactive guides</p>
                            {availableTours.map((item) => (
                                <button type="button" key={item.id} onClick={() => begin(item)}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                                    {item.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {tour && current && (
                <div role="dialog" aria-modal="false" aria-label={tour.title} className="pointer-events-none fixed inset-0 z-[90]">
                    {rect && (
                        <div aria-hidden="true" className="pointer-events-none fixed rounded-lg border-[3px] border-blue-400"
                            style={{
                                top: Math.max(0, rect.top - 5), left: Math.max(0, rect.left - 5),
                                width: rect.width + 10, height: rect.height + 10,
                                boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.65)",
                            }} />
                    )}
                    {!rect && <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black/60" />}
                    <section className="pointer-events-auto fixed w-[min(330px,calc(100vw-24px))] rounded-xl border border-blue-200 bg-white p-4 text-slate-900 shadow-2xl"
                        style={{ top: popoverTop, left: popoverLeft }}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-blue-700">Step {step + 1} of {tour.steps.length}</span>
                            <button type="button" onClick={closeTour} aria-label="Exit walkthrough" className="rounded p-1 text-slate-600 hover:bg-slate-100">✕</button>
                        </div>
                        <h2 className="font-semibold">{current.title}</h2>
                        <p className="mt-2 text-sm text-slate-700">{current.description}</p>
                        {missing && <p role="status" className="mt-2 text-xs text-amber-700">This control is not visible. Try changing the current tab or browser size.</p>}
                        <div className="mt-4 flex justify-between gap-2">
                            <button type="button" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Back</button>
                            <button type="button" onClick={() => step === tour.steps.length - 1 ? closeTour() : setStep((n) => n + 1)}
                                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                                {step === tour.steps.length - 1 ? "Finish" : "Next"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

// Read viewport dimensions only after mount (tour is client-only).
function windowSafeWidth() { return typeof window === "undefined" ? 360 : window.innerWidth; }
function windowSafeHeight() { return typeof window === "undefined" ? 750 : window.innerHeight; }
