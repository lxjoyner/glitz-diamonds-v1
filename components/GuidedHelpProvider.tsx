"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GUIDED_TOURS, permittedTours, stepMatchesPath, type GuidedTour } from "@/lib/guided-tours";

type AnchorRect = { top: number; left: number; width: number; height: number };
type ActiveTour = { id: string; step: number };
const STORAGE_KEY = "glitz-guided-help-active";

function readSavedTour(): ActiveTour | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const item = parsed as Record<string, unknown>;
        if (typeof item.id !== "string" || typeof item.step !== "number" || !Number.isInteger(item.step)) return null;
        return { id: item.id, step: item.step };
    } catch { return null; }
}

function persistTour(id: string, step: number) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, step })); } catch { /* private browsing */ }
}
function clearSavedTour() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* private browsing */ }
}

export default function GuidedHelpProvider() {
    const pathname = usePathname();
    const [access, setAccess] = useState<{ path: string; role: string; topics: string[] } | null>(null);
    const [tour, setTour] = useState<GuidedTour | null>(null);
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<AnchorRect | null>(null);
    const [missing, setMissing] = useState(false);
    const [chooserOpen, setChooserOpen] = useState(false);

    const closeTour = useCallback(() => {
        clearSavedTour();
        setTour(null);
        setRect(null);
        setMissing(false);
    }, []);

    // Revalidate Help enablement, authentication and role on every relevant route.
    // Do not trust sessionStorage as authorization.
    useEffect(() => {
        let live = true;
        const relevant = GUIDED_TOURS.some((item) => item.path === pathname || item.steps.some((s) => stepMatchesPath(s.path, pathname)));
        if (!relevant) return;
        fetch("/api/help/topics", { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) return null;
                const data = await response.json();
                if (!data?.success || !data?.helpEnabled || !Array.isArray(data.topics)) return null;
                return { role: String(data.role || ""), topics: data.topics.map((topic: { id: string }) => topic.id) as string[] };
            })
            .then((result) => {
                if (!live) return;
                if (!result) {
                    clearSavedTour();
                    setTour(null);
                    setAccess(null);
                    return;
                }
                setAccess({ path: pathname, ...result });
            })
            .catch(() => {
                if (!live) return;
                clearSavedTour();
                setTour(null);
                setAccess(null);
            });
        return () => { live = false; };
    }, [pathname]);

    const permitted = (item: GuidedTour) =>
        !!access && access.path === pathname && access.topics.includes(item.helpTopicId) &&
        item.roles.some((allowed) => allowed === access.role);
    const availableTours = access?.path === pathname
        ? permittedTours(access.role, pathname).filter(permitted)
        : [];

    const begin = useCallback((next: GuidedTour) => {
        setChooserOpen(false);
        setMissing(false);
        setStep(0);
        setTour(next);
        persistTour(next.id, 0);
    }, []);

    // Resume only at a step associated with the current route and an authorized tour.
    // Supports the navigation from Actions > Record payment, including full page loads.
    useEffect(() => {
        if (!access || access.path !== pathname) return;
        const params = new URLSearchParams(window.location.search);
        const requested = params.get("tour");
        const saved = readSavedTour();
        const candidate = requested
            ? GUIDED_TOURS.find((item) => item.id === requested && item.path === pathname)
            : GUIDED_TOURS.find((item) => item.id === saved?.id);
        if (candidate && access.topics.includes(candidate.helpTopicId) && candidate.roles.some((r) => r === access.role)) {
            const index = requested ? 0 : saved?.step ?? 0;
            const matching = candidate.steps[index] && stepMatchesPath(candidate.steps[index].path, pathname);
            if (matching) {
                setTour(candidate);
                setStep(index);
                persistTour(candidate.id, index);
            } else {
                clearSavedTour();
                setTour(null);
            }
        } else if (saved) {
            clearSavedTour();
            setTour(null);
        }
        if (requested) {
            params.delete("tour");
            const query = params.toString();
            window.history.replaceState(window.history.state, "", pathname + (query ? "?" + query : "") + window.location.hash);
        }
    }, [access, pathname]);

    // When a user navigates away from the intended step, hide the tour without
    // persisting an unintended route, and cancel it on the next authorization check.
    const current = tour?.steps[step];
    const visibleTour = tour && current && permitted(tour) && stepMatchesPath(current.path, pathname) ? tour : null;

    const advance = useCallback((next: number) => {
        if (!tour || !tour.steps[next]) return;
        setStep(next);
        persistTour(tour.id, next);
    }, [tour]);

    // Click-through steps observe actual user clicks, never synthesize click events.
    useEffect(() => {
        if (!visibleTour || !current?.advanceOnClick) return;
        const onClick = (event: MouseEvent) => {
            const element = document.querySelector(current.selector);
            if (!element || !(event.target instanceof Node) || !element.contains(event.target)) return;
            const next = step + 1;
            if (visibleTour.steps[next]) advance(next);
        };
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, [visibleTour, current, step, advance]);

    useEffect(() => {
        if (!visibleTour || !current) return;
        let resizeObserver: ResizeObserver | null = null;
        let mutationObserver: MutationObserver | null = null;
        let frame = 0;
        const position = () => {
            const anchor = document.querySelector(current.selector);
            if (!anchor) { setRect(null); setMissing(true); return; }
            const bounds = anchor.getBoundingClientRect();
            const visible = bounds.width > 0 && bounds.height > 0;
            setMissing(!visible);
            setRect(visible ? { top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height } : null);
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
        const move = () => {
            const element = document.querySelector(current.selector);
            if (element) element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            schedule();
        };
        move();
        const timer = window.setTimeout(move, 250);
        const element = document.querySelector(current.selector);
        if (element && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(schedule);
            resizeObserver.observe(element);
        }
        // Invoice rows and the Actions menu can appear after an asynchronous fetch.
        mutationObserver = new MutationObserver(schedule);
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("resize", schedule);
        window.addEventListener("scroll", schedule, true);
        const esc = (event: KeyboardEvent) => { if (event.key === "Escape") closeTour(); };
        window.addEventListener("keydown", esc);
        return () => {
            window.clearTimeout(timer);
            cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            mutationObserver?.disconnect();
            window.removeEventListener("resize", schedule);
            window.removeEventListener("scroll", schedule, true);
            window.removeEventListener("keydown", esc);
        };
    }, [visibleTour, current, closeTour]);

    // A temporary missing target (loading data, opening a menu) is not a reason
    // to progress, auto-open menus, submit, or change accounting state.
    if (!availableTours.length && !visibleTour) return null;
    const viewportWidth = typeof window === "undefined" ? 360 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 750 : window.innerHeight;
    const popupWidth = Math.min(330, viewportWidth - 24);
    const popoverTop = rect ? Math.max(12, Math.min(viewportHeight - 240, rect.top + rect.height + 14)) : 70;
    const popoverLeft = rect ? Math.max(12, Math.min(viewportWidth - popupWidth - 12, rect.left)) : 12;

    return (
        <>
            {!visibleTour && availableTours.length > 0 && (
                <div className="fixed bottom-5 right-5 z-[80]">
                    <button type="button" onClick={() => setChooserOpen((v) => !v)} aria-expanded={chooserOpen} aria-controls="guided-help-chooser"
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
            {visibleTour && current && (
                <div role="dialog" aria-modal="false" aria-label={visibleTour.title} className="pointer-events-none fixed inset-0 z-[90]">
                    {rect ? (
                        <div aria-hidden="true" className="pointer-events-none fixed rounded-lg border-[3px] border-blue-400"
                            style={{ top: Math.max(0, rect.top - 5), left: Math.max(0, rect.left - 5), width: rect.width + 10,
                                height: rect.height + 10, boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.65)" }} />
                    ) : <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black/60" />}
                    <section className="pointer-events-auto fixed w-[min(330px,calc(100vw-24px))] rounded-xl border border-blue-200 bg-white p-4 text-slate-900 shadow-2xl"
                        style={{ top: popoverTop, left: popoverLeft }}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-blue-700">Step {step + 1} of {visibleTour.steps.length}</span>
                            <button type="button" onClick={closeTour} aria-label="Exit walkthrough" className="rounded p-1 text-slate-600 hover:bg-slate-100">✕</button>
                        </div>
                        <h2 className="font-semibold">{current.title}</h2>
                        <p className="mt-2 text-sm text-slate-700">{current.description}</p>
                        {missing && <p role="status" className="mt-2 text-xs text-amber-700">This control is not visible yet. Wait for data, choose Unpaid, or change the invoice filters/page.</p>}
                        <div className="mt-4 flex justify-between gap-2">
                            <button type="button" onClick={() => advance(step - 1)}
                                disabled={step === 0 || !visibleTour.steps[step - 1] || !stepMatchesPath(visibleTour.steps[step - 1].path, pathname)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Back</button>
                            {current.advanceOnClick ? (
                                <span className="self-center text-xs font-semibold text-blue-700">Click highlighted control</span>
                            ) : (
                                <button type="button" onClick={() => step === visibleTour.steps.length - 1 ? closeTour() : advance(step + 1)}
                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                                    {step === visibleTour.steps.length - 1 ? "Finish guide" : "Next"}
                                </button>
                            )}
                        </div>
                        {step === visibleTour.steps.length - 1 && <p className="mt-2 text-xs font-semibold text-amber-800">{visibleTour.id.startsWith("invoice-create") ? "Finishing does not create or approve an invoice. Save or approve it separately only when you are ready." : "Finishing does not record a payment. Submit separately when you are ready."}</p>}
                    </section>
                </div>
            )}
        </>
    );
}
