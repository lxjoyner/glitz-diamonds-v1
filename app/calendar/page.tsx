"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ScheduledEvent = {
    id: number;
    title: string;
    idea_id: number;
    start_date: string;
    end_date: string;
    location_text: string;
};

type AuthUser = { id: string; username: string; role: string };

function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

function parseDate(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
}

function dayDiff(startDate: string, endDate: string) {
    const start = parseDate(startDate).getTime();
    const end = parseDate(endDate).getTime();
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

export default function CalendarPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState("");
    const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const canMoveEvent = user?.role === "admin" || user?.role === "secretary";

    const loadData = async () => {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (!meData?.authenticated) {
            router.push("/admin/login");
            return;
        }
        setUser(meData.user);

        const eventsRes = await fetch("/api/admin/ideas-activities", { cache: "no-store" });
        const eventsData = await eventsRes.json();
        if (!eventsRes.ok) {
            setStatusMessage(eventsData?.error || "Unable to load calendar items.");
            setLoading(false);
            return;
        }

        setScheduledEvents(eventsData.scheduledEvents || []);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const monthDays = useMemo(() => {
        const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
        const start = new Date(first);
        start.setDate(1 - first.getDay());

        const days: Date[] = [];
        for (let i = 0; i < 42; i += 1) {
            days.push(addDays(start, i));
        }
        return days;
    }, [visibleMonth]);

    const eventsByDay = useMemo(() => {
        const map = new Map<string, ScheduledEvent[]>();
        for (const event of scheduledEvents) {
            const key = event.start_date.slice(0, 10);
            const existing = map.get(key) || [];
            existing.push(event);
            map.set(key, existing);
        }
        return map;
    }, [scheduledEvents]);

    const moveEvent = async (eventId: number, newStartDate: string) => {
        const original = scheduledEvents.find((event) => event.id === eventId);
        if (!original) return;

        const durationInDays = dayDiff(original.start_date, original.end_date);
        const nextEndDate = toIsoDate(addDays(parseDate(newStartDate), durationInDays));

        const res = await fetch(`/api/admin/ideas-activities/scheduled-events/${eventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                startDate: newStartDate,
                endDate: nextEndDate,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            setStatusMessage(data?.error || "Unable to move calendar item.");
            return;
        }

        setStatusMessage(`Moved "${original.title}" to ${newStartDate}.`);
        await loadData();
    };

    if (loading) {
        return <main className="mx-auto max-w-6xl px-4 py-10 text-slate-200">Loading calendar...</main>;
    }

    return (
        <main className="mx-auto max-w-6xl px-4 py-10 text-slate-100">
            <section className="rounded-2xl border border-white/10 bg-[#2B193D]/70 p-6 shadow-xl">
                <h1 className="text-3xl font-semibold text-[#f7d7ff]">📅 Calendar</h1>
                <p className="mt-2 text-sm text-slate-200">
                    This calendar shows events scheduled from Ideas & Activities. Drag and drop an event to any date, including different months.
                </p>
                {statusMessage && <p className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-sm text-[#ffe8f6]">{statusMessage}</p>}
            </section>

            <section className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#261632] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <button
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
                        onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    >
                        ← Previous
                    </button>
                    <h2 className="text-xl font-semibold text-[#ffdef7]">
                        {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth)}
                    </h2>
                    <button
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
                        onClick={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    >
                        Next →
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-wide text-slate-300">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                    {monthDays.map((day) => {
                        const dayKey = toIsoDate(day);
                        const items = eventsByDay.get(dayKey) || [];
                        const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                        const isToday = dayKey === toIsoDate(new Date());

                        return (
                            <div
                                key={dayKey}
                                className={`min-h-28 rounded-lg border p-2 ${isCurrentMonth ? "border-white/10 bg-black/20" : "border-white/5 bg-black/10 text-slate-400"}`}
                                onDragOver={(event) => {
                                    if (canMoveEvent) event.preventDefault();
                                }}
                                onDrop={(event) => {
                                    if (!canMoveEvent) return;
                                    event.preventDefault();
                                    const eventId = Number(event.dataTransfer.getData("text/event-id"));
                                    if (!eventId) return;
                                    moveEvent(eventId, dayKey);
                                }}
                            >
                                <p className={`mb-1 text-xs font-semibold ${isToday ? "text-[#D4AF37]" : ""}`}>{day.getDate()}</p>
                                <div className="space-y-1">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            draggable={canMoveEvent}
                                            onDragStart={(event) => {
                                                event.dataTransfer.setData("text/event-id", String(item.id));
                                            }}
                                            className={`rounded-md px-2 py-1 text-xs ${canMoveEvent ? "cursor-move bg-purple-700/80" : "bg-purple-700/40"}`}
                                            title={`${item.title} • ${item.start_date.slice(0, 10)} to ${item.end_date.slice(0, 10)} • ${item.location_text}`}
                                        >
                                            <p className="font-medium">{item.title}</p>
                                            <p className="mt-0.5 text-[11px] text-purple-100/90">{item.location_text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
