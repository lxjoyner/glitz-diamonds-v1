"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RecurringInvoice = {
    id: number;
    member_id: number;
    member_name: string | null;
    member_email: string | null;
    status: "active" | "draft" | "ended";
    cadence: string;
    repeat_day: number;
    first_invoice_date: string;
    next_invoice_date: string;
    previous_invoice_date: string | null;
    end_date: string | null;
    amount_cents: number;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
const displayDate = (value: string | null) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US") : "—";

export default function RecurringInvoicesPage() {
    const router = useRouter();
    const [rows, setRows] = useState<RecurringInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [memberFilter, setMemberFilter] = useState("all");
    const [tab, setTab] = useState<"active" | "draft" | "all">("active");
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    async function load() {
        setError("");
        try {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) throw new Error("Only admins and treasurers can access recurring invoices.");

            const res = await fetch("/api/admin/recurring-invoices", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to load recurring invoices.");
            setRows(data.recurringInvoices || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load recurring invoices.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const members = useMemo(() => Array.from(new Map(rows.map((row) => [row.member_id, row.member_name])).entries()), [rows]);
    const activeCount = rows.filter((row) => row.status === "active").length;
    const draftCount = rows.filter((row) => row.status === "draft").length;

    const filtered = rows.filter((row) => {
        if (memberFilter !== "all" && String(row.member_id) !== memberFilter) return false;
        if (tab !== "all" && row.status !== tab) return false;
        return true;
    });

    async function endRecurring(row: RecurringInvoice) {
        if (!window.confirm(`End recurring invoices for ${row.member_name || "this member"}?`)) return;
        const res = await fetch(`/api/admin/recurring-invoices/${row.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) return setError(data?.error || "Failed to end recurring invoice.");
        setOpenMenuId(null);
        await load();
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-7 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Recurring invoices</h1>
                    <Link href="/admin/invoices/recurring/new" className="rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-slate-900">Create a recurring invoice</Link>
                </header>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-8 max-w-sm">
                        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 italic text-slate-600">
                            <option value="all">All customers</option>
                            {members.map(([id, name]) => <option key={id} value={id}>{name || `Member #${id}`}</option>)}
                        </select>
                    </div>

                    <div className="mb-8 flex flex-wrap justify-center gap-1 border-b border-slate-200 pb-5">
                        <button onClick={() => setTab("active")} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold ${tab === "active" ? "bg-blue-100 text-blue-900 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                            <span>Active</span><span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-green-600 px-2 text-sm font-bold leading-none text-white">{activeCount}</span>
                        </button>
                        <button onClick={() => setTab("draft")} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold ${tab === "draft" ? "bg-blue-100 text-blue-900 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                            <span>Draft</span><span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-yellow-300 px-2 text-sm font-bold leading-none text-black">{draftCount}</span>
                        </button>
                        <button onClick={() => setTab("all")} className={`rounded-xl px-5 py-2.5 font-semibold ${tab === "all" ? "bg-blue-100 text-blue-900 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>All recurring invoices</button>
                    </div>

                    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
                    {loading ? <p className="py-12 text-center text-slate-500">Loading recurring invoices...</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200 text-left">
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3">Customer</th>
                                        <th className="px-3 py-3">Schedule</th>
                                        <th className="px-3 py-3">Previous invoice</th>
                                        <th className="px-3 py-3">Next invoice</th>
                                        <th className="px-3 py-3 text-right">Invoice amount</th>
                                        <th className="px-3 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((row) => (
                                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-3 py-4"><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${row.status === "active" ? "bg-emerald-100 text-emerald-800" : row.status === "draft" ? "bg-yellow-200 text-black" : "bg-slate-200 text-slate-700"}`}>{row.status === "active" ? "Active" : row.status === "draft" ? "Draft" : "Ended"}</span></td>
                                            <td className="px-3 py-4 font-medium">{row.member_name || `Member #${row.member_id}`}</td>
                                            <td className="px-3 py-4"><div>Repeat monthly on the {row.repeat_day}{row.repeat_day === 1 ? "st" : row.repeat_day === 2 ? "nd" : row.repeat_day === 3 ? "rd" : "th"}</div><div className="text-xs text-slate-500">First invoice: {displayDate(row.first_invoice_date)}, Ends: {row.end_date ? displayDate(row.end_date) : "Never"}</div></td>
                                            <td className="px-3 py-4">{displayDate(row.previous_invoice_date)}</td>
                                            <td className="px-3 py-4">{displayDate(row.next_invoice_date)}</td>
                                            <td className="px-3 py-4 text-right">{money(row.amount_cents)}</td>
                                            <td className="relative px-3 py-4 text-right">
                                                <button onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50" aria-label={`Actions for ${row.member_name || "recurring invoice"}`}>⌄</button>
                                                {openMenuId === row.id && (
                                                    <div className="absolute right-3 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-2 text-left shadow-lg">
                                                        <Link href={`/admin/invoices/recurring/${row.id}`} className="block px-4 py-2 hover:bg-slate-50">View</Link>
                                                        <Link href={`/admin/invoices/recurring/${row.id}/edit`} className="block px-4 py-2 hover:bg-slate-50">Edit</Link>
                                                        {row.status !== "ended" && <button onClick={() => endRecurring(row)} className="block w-full px-4 py-2 text-left text-red-700 hover:bg-red-50">End</button>}
                                                        <Link href={`/admin/invoices/recurring/${row.id}/created`} className="block px-4 py-2 hover:bg-slate-50">View created invoices</Link>
                                                        <Link href={`/admin/invoices/recurring/${row.id}/duplicate`} className="block px-4 py-2 hover:bg-slate-50">Duplicate</Link>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && <p className="py-10 text-center text-slate-400">No recurring invoices match the selected filters.</p>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
