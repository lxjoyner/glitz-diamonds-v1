"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = { id: string; username: string; role: string };
type Idea = {
    id: number;
    title: string;
    details: string;
    category: string;
    purpose: string;
    location_type: string;
    location_text: string;
    budget_range: string;
    time_commitment: string;
    group_size: number;
    preferred_start_date: string;
    preferred_end_date: string;
    status: "draft" | "submitted";
    vote_count: number;
    favorite_count: number;
    has_upvoted: number;
    has_favorited: number;
    created_by_name: string | null;
    file_name: string | null;
};

type ScheduledEvent = {
    id: number;
    idea_id: number;
    title: string;
    start_date: string;
    end_date: string;
    location_text: string;
};

type Poll = {
    id: number;
    question: string;
    options: Array<{ id: number; option_label: string; vote_count: number; selected_by_user: number }>;
};

const categoryOptions = ["Volunteer/Outreach", "Wellness", "Trip", "Dining Out", "Celebration", "Other"];
const purposeOptions = ["Give Back", "Build Connections", "Relax and Recharge", "Improve Health", "Personal Growth"];
const locationTypeOptions = ["Indoor", "Outdoor", "Virtual", "Hybrid"];
const budgetOptions = ["$100-$500", "$600-1000", "more than $1000", "less than $100"];
const timeCommitmentOptions = ["4-8 hrs", "Half Day", "Full Day", "Weekend", "Monthly", "Every Other Month", "Every 3 Months", "Every 6 Months"];

export default function IdeasActivitiesPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
    const [pollsByIdea, setPollsByIdea] = useState<Record<number, Poll[]>>({});
    const [smartRecommendation, setSmartRecommendation] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        title: "",
        details: "",
        category: categoryOptions[0],
        purpose: purposeOptions[0],
        locationType: locationTypeOptions[0],
        location: "",
        budgetRange: budgetOptions[0],
        timeCommitment: timeCommitmentOptions[0],
        groupSize: "10",
        preferredStartDate: "",
        preferredEndDate: "",
    });

    const [draftFile, setDraftFile] = useState<File | null>(null);

    const canSchedule = user?.role === "admin" || user?.role === "secretary";

    const previewTitle = form.title.trim() || "Donation Drive";

    const loadData = async () => {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();

        if (!meData?.authenticated) {
            router.push("/admin/login");
            return;
        }

        setUser(meData.user);

        const res = await fetch("/api/admin/ideas-activities", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
            setStatusMessage(data?.error || "Failed to load ideas and activities.");
            setLoading(false);
            return;
        }

        setIdeas(data.ideas || []);
        setScheduledEvents(data.scheduledEvents || []);
        setSmartRecommendation(data.smartRecommendation || "");

        const pollsMap: Record<number, Poll[]> = {};
        await Promise.all(
            (data.ideas || []).map(async (idea: Idea) => {
                const pollsRes = await fetch(`/api/admin/ideas-activities/${idea.id}/polls`, { cache: "no-store" });
                const pollData = await pollsRes.json();
                pollsMap[idea.id] = pollData?.polls || [];
            })
        );
        setPollsByIdea(pollsMap);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitIdea = async (mode: "submitted" | "draft") => {
        setStatusMessage("");

        const payload = new FormData();
        Object.entries(form).forEach(([key, value]) => payload.append(key, value));
        payload.append("status", mode);
        if (draftFile) payload.append("file", draftFile);

        const res = await fetch("/api/admin/ideas-activities", {
            method: "POST",
            body: payload,
        });

        const data = await res.json();
        if (!res.ok) {
            setStatusMessage(data?.error || "Failed to save idea.");
            return;
        }

        setStatusMessage(mode === "draft" ? "Draft saved." : "Idea submitted for voting.");
        setForm({
            title: "",
            details: "",
            category: categoryOptions[0],
            purpose: purposeOptions[0],
            locationType: locationTypeOptions[0],
            location: "",
            budgetRange: budgetOptions[0],
            timeCommitment: timeCommitmentOptions[0],
            groupSize: "10",
            preferredStartDate: "",
            preferredEndDate: "",
        });
        setDraftFile(null);
        await loadData();
    };

    const toggleVote = async (ideaId: number) => {
        await fetch(`/api/admin/ideas-activities/${ideaId}/vote`, { method: "POST" });
        await loadData();
    };

    const toggleFavorite = async (ideaId: number) => {
        await fetch(`/api/admin/ideas-activities/${ideaId}/favorite`, { method: "POST" });
        await loadData();
    };

    const scheduleIdea = async (idea: Idea) => {
        const startDate = window.prompt("Scheduled start date (YYYY-MM-DD)", idea.preferred_start_date.slice(0, 10));
        const endDate = window.prompt("Scheduled end date (YYYY-MM-DD)", idea.preferred_end_date.slice(0, 10));

        if (!startDate || !endDate) return;

        const res = await fetch(`/api/admin/ideas-activities/${idea.id}/schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: idea.title, location: idea.location_text, startDate, endDate }),
        });

        const data = await res.json();
        if (!res.ok) {
            setStatusMessage(data?.error || "Unable to schedule activity.");
            return;
        }

        setStatusMessage("Activity added to calendar scheduler.");
        await loadData();
    };

    const createPoll = async (ideaId: number) => {
        const question = window.prompt("Poll question", "Which should we do this Saturday?");
        if (!question) return;
        const optionA = window.prompt("Option 1", "Spa Day");
        const optionB = window.prompt("Option 2", "Brunch");
        const optionC = window.prompt("Option 3", "Hiking");

        const options = [optionA, optionB, optionC].map((v) => String(v || "").trim()).filter(Boolean);

        const res = await fetch(`/api/admin/ideas-activities/${ideaId}/polls`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, options }),
        });

        const data = await res.json();
        if (!res.ok) {
            setStatusMessage(data?.error || "Unable to create poll.");
            return;
        }

        setStatusMessage("Poll created.");
        await loadData();
    };

    const votePoll = async (pollId: number, optionId: number) => {
        await fetch(`/api/admin/ideas-activities/polls/${pollId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ optionId }),
        });
        await loadData();
    };

    const monthLabel = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date()), []);

    if (loading) {
        return <main className="mx-auto max-w-6xl px-4 py-10 text-slate-200">Loading Ideas & Activities...</main>;
    }

    return (
        <main className="mx-auto max-w-6xl px-4 py-10 text-slate-100">
            <section className="rounded-2xl border border-white/10 bg-[#2B193D]/70 p-6 shadow-xl">
                <h1 className="text-3xl font-semibold text-[#f7d7ff]">💡 Ideas & Activities</h1>
                <p className="mt-2 text-sm text-slate-200">Suggest activity ideas, vote together, build polls, and schedule selected events on the calendar.</p>
                {statusMessage && <p className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-sm text-[#ffe8f6]">{statusMessage}</p>}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <form className="rounded-2xl border border-[#D4AF37]/30 bg-[#3A234E]/80 p-5" onSubmit={(e) => e.preventDefault()}>
                    <h2 className="text-xl font-semibold text-[#ffebf8]">Suggest an Activity</h2>
                    <div className="mt-4 grid gap-3">
                        <input className="rounded-lg bg-white/10 px-3 py-2" placeholder="Donation Drive, Women Group Trip" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                        <textarea className="min-h-28 rounded-lg bg-white/10 px-3 py-2" placeholder="Description/Details" value={form.details} onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))} />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <select className="rounded-lg bg-white/10 px-3 py-2" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>{categoryOptions.map((option) => <option className="text-black" key={option}>{option}</option>)}</select>
                            <select className="rounded-lg bg-white/10 px-3 py-2" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}>{purposeOptions.map((option) => <option className="text-black" key={option}>{option}</option>)}</select>
                            <select className="rounded-lg bg-white/10 px-3 py-2" value={form.locationType} onChange={(e) => setForm((p) => ({ ...p, locationType: e.target.value }))}>{locationTypeOptions.map((option) => <option className="text-black" key={option}>{option}</option>)}</select>
                            <input className="rounded-lg bg-white/10 px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                            <select className="rounded-lg bg-white/10 px-3 py-2" value={form.budgetRange} onChange={(e) => setForm((p) => ({ ...p, budgetRange: e.target.value }))}>{budgetOptions.map((option) => <option className="text-black" key={option}>{option}</option>)}</select>
                            <select className="rounded-lg bg-white/10 px-3 py-2" value={form.timeCommitment} onChange={(e) => setForm((p) => ({ ...p, timeCommitment: e.target.value }))}>{timeCommitmentOptions.map((option) => <option className="text-black" key={option}>{option}</option>)}</select>
                            <input className="rounded-lg bg-white/10 px-3 py-2" type="number" min={1} max={500} value={form.groupSize} onChange={(e) => setForm((p) => ({ ...p, groupSize: e.target.value }))} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs">Preferred Date From<input className="mt-1 block w-full rounded-lg bg-white/10 px-3 py-2" type="date" value={form.preferredStartDate} onChange={(e) => setForm((p) => ({ ...p, preferredStartDate: e.target.value }))} /></label>
                            <label className="text-xs">Preferred Date To<input className="mt-1 block w-full rounded-lg bg-white/10 px-3 py-2" type="date" value={form.preferredEndDate} onChange={(e) => setForm((p) => ({ ...p, preferredEndDate: e.target.value }))} /></label>
                        </div>
                        <label className="text-xs">Image / File (images or PDF only)
                            <input className="mt-1 block w-full rounded-lg bg-white/10 px-3 py-2" type="file" accept="image/*,application/pdf" onChange={(e) => setDraftFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <button className="rounded-lg bg-[#D4AF37] px-4 py-2 font-semibold text-black" onClick={() => submitIdea("submitted")}>Submit</button>
                        <button className="rounded-lg border border-white/30 px-4 py-2" onClick={() => submitIdea("draft")}>Save As Draft</button>
                    </div>
                </form>

                <aside className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-[#4A2C5E]/80 p-5">
                        <h3 className="font-semibold text-[#FFDDEE]">Live Preview Card</h3>
                        <div className="mt-3 rounded-xl border border-[#D4AF37]/40 bg-black/30 p-4">
                            <p className="text-lg font-semibold">{previewTitle}</p>
                            <p className="mt-1 text-sm text-slate-200">{form.details || "Add details to preview your activity card."}</p>
                            <p className="mt-2 text-xs text-slate-300">{form.category} • {form.purpose} • {form.locationType}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#4A2C5E]/80 p-5">
                        <h3 className="font-semibold text-[#FFDDEE]">Popular this month</h3>
                        <p className="mt-2 text-sm text-slate-200">{smartRecommendation || "You might also like: Outdoor Yoga + Smoothie Meetup"}</p>
                    </div>
                </aside>
            </section>

            <section className="mt-8">
                <h2 className="mb-3 text-2xl font-semibold text-[#F8E1FF]">Community Ideas & Voting</h2>
                <div className="grid gap-4">
                    {ideas.map((idea) => (
                        <article key={idea.id} className="rounded-2xl border border-white/10 bg-[#2c1b3f]/80 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-xl font-semibold">{idea.title}</h3>
                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">{idea.status}</span>
                            </div>
                            <p className="mt-2 text-sm text-slate-200">{idea.details}</p>
                            <p className="mt-2 text-xs text-slate-300">By {idea.created_by_name || "Member"} • {idea.category} • {idea.purpose} • {idea.location_text}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button className="rounded-lg bg-purple-700 px-3 py-1.5 text-sm" onClick={() => toggleVote(idea.id)}>👍 Upvote ({idea.vote_count})</button>
                                <button className="rounded-lg bg-pink-700 px-3 py-1.5 text-sm" onClick={() => toggleFavorite(idea.id)}>❤️ Favorite ({idea.favorite_count})</button>
                                <button className="rounded-lg bg-indigo-700 px-3 py-1.5 text-sm" onClick={() => createPoll(idea.id)}>Create Poll</button>
                                {canSchedule && <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm" onClick={() => scheduleIdea(idea)}>Add to Calendar</button>}
                                {idea.file_name && <a className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm" href={`/api/admin/ideas-activities/${idea.id}/file`} target="_blank">Open File</a>}
                            </div>

                            {(pollsByIdea[idea.id] || []).map((poll) => (
                                <div key={poll.id} className="mt-4 rounded-lg border border-white/15 bg-black/25 p-3">
                                    <p className="font-medium">📊 {poll.question}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {poll.options.map((option) => (
                                            <button
                                                key={option.id}
                                                className={`rounded-lg px-3 py-1 text-sm ${option.selected_by_user ? "bg-[#D4AF37] text-black" : "bg-white/10"}`}
                                                onClick={() => votePoll(poll.id, option.id)}
                                            >
                                                {option.option_label} ({option.vote_count})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </article>
                    ))}

                    {ideas.length === 0 && <p className="rounded-xl border border-dashed border-white/20 p-6 text-sm text-slate-300">No ideas submitted yet.</p>}
                </div>
            </section>

            <section className="mt-10 rounded-2xl border border-[#D4AF37]/40 bg-[#261632] p-5">
                <h2 className="text-2xl font-semibold text-[#ffdef7]">📅 Calendar Scheduler</h2>
                <p className="mt-1 text-sm text-slate-200">{monthLabel}</p>
                <div className="mt-4 grid gap-3">
                    {scheduledEvents.map((event) => (
                        <div key={event.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-sm text-slate-300">{event.start_date.slice(0, 10)} to {event.end_date.slice(0, 10)} • {event.location_text}</p>
                        </div>
                    ))}
                    {scheduledEvents.length === 0 && <p className="text-sm text-slate-300">No events scheduled yet.</p>}
                </div>
            </section>
        </main>
    );
}
