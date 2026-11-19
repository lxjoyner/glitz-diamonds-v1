"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Topic = {
    id: string;
    title: string;
    category: string;
    summary: string;
    path: string;
    videoStatus: "coming_soon" | "available";
    videos: Array<{ id: number; title: string; description: string; url: string }>;
};

type Status = "loading" | "ready" | "disabled" | "unauthorized" | "error";

export default function HelpCenterPage() {
    const [status, setStatus] = useState<Status>("loading");
    const [role, setRole] = useState("");
    const [topics, setTopics] = useState<Topic[]>([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All topics");

    useEffect(() => {
        let mounted = true;
        fetch("/api/help/topics", { cache: "no-store" })
            .then(async (response) => {
                const data = await response.json();
                if (!mounted) return;
                if (response.status === 401) setStatus("unauthorized");
                else if (response.status === 403 && data?.helpEnabled === false) setStatus("disabled");
                else if (!response.ok || !data?.success) setStatus("error");
                else {
                    setRole(data.role);
                    setTopics(data.topics || []);
                    setStatus("ready");
                }
            })
            .catch(() => { if (mounted) setStatus("error"); });
        return () => { mounted = false; };
    }, []);

    const categories = useMemo(() =>
        ["All topics", ...Array.from(new Set(topics.map((topic) => topic.category))).sort()],
        [topics]
    );
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return topics.filter((topic) =>
            (category === "All topics" || topic.category === category) &&
            (!needle || [topic.title, topic.category, topic.summary].some((text) => text.toLowerCase().includes(needle)))
        );
    }, [category, query, topics]);

    return (
        <main className="min-h-screen bg-black px-4 py-12 text-white">
            <section className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-semibold">Help Center</h1>
                        <p className="mt-2 text-sm text-slate-300">
                            Find help for the features available to your account.
                        </p>
                    </div>
                    {status === "ready" && <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-sm capitalize">{role} help</span>}
                    {status === "ready" && role === "admin" && <Link href="/admin/help-videos" className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10">Manage Help Videos</Link>}
                </div>

                {status === "loading" && <p className="mt-7 text-slate-300" role="status">Loading available help topics...</p>}
                {status === "unauthorized" && <p className="mt-7 text-slate-300">Please <Link href="/admin/login" className="text-red-300 underline">sign in</Link> to access Help.</p>}
                {status === "disabled" && <p className="mt-7 text-slate-300">Help is currently disabled by the administrator.</p>}
                {status === "error" && <p className="mt-7 text-slate-300" role="alert">Help is temporarily unavailable. Please refresh the page or try again later.</p>}

                {status === "ready" && (
                    <div className="mt-7 space-y-6">
                        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                            <label className="space-y-1">
                                <span className="block text-sm text-slate-300">Search help topics</span>
                                <input
                                    type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search invoices, profile, calendar..."
                                    className="w-full rounded-lg border border-white/20 bg-black/50 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                                />
                            </label>
                            <label className="space-y-1">
                                <span className="block text-sm text-slate-300">Category</span>
                                <select value={category} onChange={(event) => setCategory(event.target.value)}
                                    className="w-full rounded-lg border border-white/20 bg-black px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600">
                                    {categories.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>
                        </div>
                        <p className="text-sm text-slate-400" aria-live="polite">{filtered.length} {filtered.length === 1 ? "topic" : "topics"} available</p>
                        {filtered.length === 0 ? (
                            <p className="rounded-xl border border-white/15 bg-black/30 p-5 text-sm text-slate-300">No help topics match this search. Try a different keyword or category.</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {filtered.map((topic) => (
                                    <article key={topic.id} className="flex flex-col rounded-xl border border-white/15 bg-black/30 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-red-300">{topic.category}</p>
                                        <h2 className="mt-2 text-lg font-semibold">{topic.title}</h2>
                                        <p className="mt-2 flex-1 text-sm text-slate-300">{topic.summary}</p>
                                        {topic.videos?.length ? (
                                            <div className="mt-4 space-y-3">
                                                {topic.videos.map((video) => (
                                                    <div key={video.id} className="rounded-lg border border-white/15 p-3">
                                                        <p className="text-sm font-semibold">{video.title}</p>
                                                        {video.description && <p className="mt-1 text-xs text-slate-300">{video.description}</p>}
                                                        <video controls preload="none" playsInline controlsList="nodownload"
                                                            className="mt-3 w-full rounded-lg" src={video.url} aria-label={video.title}>
                                                            Your browser does not support MP4 playback.
                                                        </video>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-4 text-xs text-slate-400">Video tutorial: not yet available</p>
                                        )}
                                        {topic.id === "reports" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link href="/admin/reports/income-by-customer?tour=report-income-overview"
                                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                    Show Me How: Income by Customer
                                                </Link>
                                                <Link href="/admin/reports/account-transactions?tour=report-transactions-overview"
                                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                    Show Me How: Account Transactions
                                                </Link>
                                                <Link href="/admin/reports/balance-sheet?tour=report-balance-overview"
                                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                    Show Me How: Balance Sheet
                                                </Link>
                                            </div>
                                        )}
                                        {topic.id === "transactions" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link href="/admin/transactions?tour=transactions-overview" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Explore Transactions</Link>
                                                <Link href="/admin/transactions?tour=transactions-edit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Show Me How: Edit Transaction</Link>
                                            </div>
                                        )}
                                        {topic.id === "vendors" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link href="/admin/vendors?tour=vendor-directory" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Explore Vendor Directory</Link>
                                                <Link href="/admin/vendors?tour=vendor-create" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Show Me How: Add Vendor</Link>
                                                <Link href="/admin/vendors?tour=vendor-edit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Show Me How: Edit Vendor</Link>
                                                <Link href="/admin/vendors?tour=vendor-create-bill" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Show Me How: Create Vendor Bill</Link>
                                            </div>
                                        )}
                                        {topic.id === "vendor-bills" && (
                                            <Link href="/admin/vendors/bills?tour=vendor-bills-review"
                                                className="mt-3 inline-flex self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                Show Me How: Review Vendor Bill Status
                                            </Link>
                                        )}
                                        {topic.id === "vendor-bills" && (
                                            <Link href="/admin/vendors/bills?tour=vendor-bill-record-payment"
                                                className="mt-3 inline-flex self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                Show Me How: Record Vendor Bill Payment
                                            </Link>
                                        )}
                                        {topic.id === "recurring" && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Link href="/admin/invoices/recurring?tour=recurring-create"
                                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                    Show Me How: Create Recurring Invoice
                                                </Link>
                                                <Link href="/admin/invoices/recurring?tour=recurring-manage"
                                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                    Manage Recurring Schedules
                                                </Link>
                                                <Link href="/admin/invoices/recurring?tour=recurring-scheduler-overview"
                                                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                    Understand Scheduler
                                                </Link>
                                            </div>
                                        )}
                                        {topic.id === "new-invoice" && (
                                            <Link href="/admin/invoices/new?tour=invoice-create-on-page"
                                                className="mt-3 inline-flex self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                Show Me How: Create Invoice
                                            </Link>
                                        )}
                                        {topic.id === "invoices" && role === "admin" && (
                                            <Link href="/admin/invoices?tour=invoice-reverse-payment"
                                                className="mt-3 inline-flex self-start rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                                                Show Me How: Reverse a Payment
                                            </Link>
                                        )}
                                        {topic.id === "invoices" && (
                                            <Link href="/admin/invoices?tour=invoice-record-payment"
                                                className="mt-3 inline-flex self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                                                Show Me How: Record Payment
                                            </Link>
                                        )}
                                        {topic.id === "invoices" && (
                                            <Link href="/admin/invoices?tour=invoice-dashboard-overview"
                                                className="mt-3 inline-flex self-start rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
                                                Start Interactive Guide
                                            </Link>
                                        )}
                                        <Link href={topic.path} className="mt-3 inline-flex self-start rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                                            Open feature
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
