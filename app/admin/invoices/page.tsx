"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Invoice = {
    id: number;
    invoice_number: string;
    member_id: number;
    member_name: string;
    member_email?: string;
    invoice_date: string;
    due_date: string;
    display_status: string;
    total_cents: number;
    amount_paid_cents: number;
    sent_at?: string | null;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
const prettyStatus = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function InvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [memberFilter, setMemberFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [numberFilter, setNumberFilter] = useState("");
    const [tab, setTab] = useState("unpaid");

    async function loadInvoices() {
        const res = await fetch("/api/admin/invoices", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load invoices.");
        setInvoices(data.invoices || []);
    }

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch("/api/admin/me", { cache: "no-store" });
                const me = await meRes.json();
                if (!me?.authenticated) return router.push("/admin/login");
                if (!["admin", "treasurer"].includes(me.user?.role)) throw new Error("Only admins and treasurers can access invoices.");
                await loadInvoices();
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load invoices.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [router]);

    async function sendInvoice(invoice: Invoice) {
        setError("");
        setNotice("");
        setSendingId(invoice.id);
        try {
            const response = await fetch(`/api/admin/invoices/${invoice.id}/send`, { method: "POST" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Failed to send invoice.");
            setNotice(`${invoice.invoice_number} was sent to ${invoice.member_email || invoice.member_name}.`);
            await loadInvoices();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to send invoice.");
        } finally {
            setSendingId(null);
        }
    }

    const members = useMemo(() => Array.from(new Map(invoices.map((invoice) => [invoice.member_id, invoice.member_name])).entries()), [invoices]);
    const counts = useMemo(() => ({
        unpaid: invoices.filter((i) => !["paid", "void", "draft"].includes(i.display_status)).length,
        pastDue: invoices.filter((i) => i.display_status === "past_due").length,
        draft: invoices.filter((i) => i.display_status === "draft").length,
        paid: invoices.filter((i) => i.display_status === "paid").length,
    }), [invoices]);

    const summary = useMemo(() => {
        const now = new Date();
        const next30 = new Date(); next30.setDate(next30.getDate() + 30);
        const outstanding = invoices.reduce((s, i) => s + Math.max(0, i.total_cents - i.amount_paid_cents), 0);
        const overdue = invoices.filter((i) => i.display_status === "past_due").reduce((s, i) => s + Math.max(0, i.total_cents - i.amount_paid_cents), 0);
        const due30 = invoices.filter((i) => { const d = new Date(i.due_date); return d >= now && d <= next30 && !["paid", "void", "draft"].includes(i.display_status); }).reduce((s, i) => s + Math.max(0, i.total_cents - i.amount_paid_cents), 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const paidMonth = invoices.filter((i) => i.display_status === "paid" && new Date(i.invoice_date) >= monthStart).reduce((s, i) => s + i.amount_paid_cents, 0);
        return { overdue, due30, paidMonth, outstanding };
    }, [invoices]);

    const filtered = useMemo(() => invoices.filter((invoice) => {
        if (memberFilter !== "all" && String(invoice.member_id) !== memberFilter) return false;
        if (statusFilter !== "all" && invoice.display_status !== statusFilter) return false;
        if (fromDate && invoice.invoice_date.slice(0, 10) < fromDate) return false;
        if (toDate && invoice.invoice_date.slice(0, 10) > toDate) return false;
        if (numberFilter && !invoice.invoice_number.toLowerCase().includes(numberFilter.toLowerCase())) return false;
        if (tab === "unpaid" && ["paid", "void", "draft"].includes(invoice.display_status)) return false;
        if (tab === "past_due" && invoice.display_status !== "past_due") return false;
        if (tab === "draft" && invoice.display_status !== "draft") return false;
        if (tab === "paid" && invoice.display_status !== "paid") return false;
        return true;
    }), [invoices, memberFilter, statusFilter, fromDate, toDate, numberFilter, tab]);

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-white">Invoices</h1>
                        <p className="mt-1 text-sm text-white">Glitz Of Diamonds invoicing dashboard</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/admin/invoices/settings" className="rounded-full border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50">Invoice settings</Link>
                        <Link href="/admin/invoices/new" className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800">Create an invoice</Link>
                    </div>
                </header>

                <section className="mb-8 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
                    {[
                        ["Past due", money(summary.overdue), `${counts.pastDue} invoices`],
                        ["Due within next 30 days", money(summary.due30), "Open invoices"],
                        ["Paid this month", money(summary.paidMonth), `${counts.paid} paid total`],
                        ["Outstanding", money(summary.outstanding), `${counts.unpaid} unpaid invoices`],
                    ].map(([label, value, sub]) => <div key={label}><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-medium">{value}</p><p className="mt-2 text-sm text-slate-400">{sub}</p></div>)}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-5">
                        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3"><option value="all">All members</option>{members.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3"><option value="all">All statuses</option><option value="draft">Draft</option><option value="due">Due</option><option value="past_due">Past due</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="void">Void</option></select>
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3" />
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3" />
                        <input value={numberFilter} onChange={(e) => setNumberFilter(e.target.value)} placeholder="Enter invoice #" className="rounded-xl border border-slate-300 px-4 py-3" />
                    </div>

                    <div className="my-7 flex flex-wrap justify-center gap-1 border-b border-slate-200 pb-5">
                        {[["unpaid", `Unpaid ${counts.unpaid}`], ["past_due", `Past Due ${counts.pastDue}`], ["draft", `Draft ${counts.draft}`], ["paid", `Paid ${counts.paid}`], ["all", "All invoices"]].map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-xl px-5 py-2.5 font-semibold ${tab === value ? "bg-blue-100 text-blue-900 shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}
                    </div>

                    {notice && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{notice}</p>}
                    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
                    {loading ? <p className="py-12 text-center text-slate-500">Loading invoices...</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1150px] border-collapse text-sm">
                                <thead><tr className="border-b-2 border-slate-200 text-left"><th className="px-3 py-3">Status</th><th className="px-3 py-3">Due</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Number</th><th className="px-3 py-3">Member</th><th className="px-3 py-3 text-right">Amount</th><th className="px-3 py-3 text-right">Paid</th><th className="px-3 py-3 text-right">Balance</th><th className="px-3 py-3 text-right">Actions</th></tr></thead>
                                <tbody>{filtered.map((invoice) => {
                                    const balance = Math.max(0, invoice.total_cents - invoice.amount_paid_cents);
                                    const overdue = invoice.display_status === "past_due";
                                    const canSend = !["paid", "void"].includes(invoice.display_status);
                                    return <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-4"><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${invoice.display_status === "paid" ? "bg-emerald-100 text-emerald-800" : overdue ? "bg-red-100 text-red-700" : invoice.display_status === "draft" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{prettyStatus(invoice.display_status)}</span></td><td className={`px-3 py-4 ${overdue ? "font-semibold text-red-600" : ""}`}>{new Date(invoice.due_date).toLocaleDateString()}</td><td className="px-3 py-4">{new Date(invoice.invoice_date).toLocaleDateString()}</td><td className="px-3 py-4 font-semibold text-blue-700">{invoice.invoice_number}</td><td className="px-3 py-4"><div>{invoice.member_name || `Member #${invoice.member_id}`}</div><div className="text-xs text-slate-400">{invoice.member_email || "No email"}</div></td><td className="px-3 py-4 text-right">{money(invoice.total_cents)}</td><td className="px-3 py-4 text-right">{money(invoice.amount_paid_cents)}</td><td className="px-3 py-4 text-right font-semibold">{money(balance)}</td><td className="px-3 py-4 text-right">{canSend ? <button type="button" onClick={() => sendInvoice(invoice)} disabled={sendingId === invoice.id || !invoice.member_email} className="font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{sendingId === invoice.id ? "Sending..." : invoice.sent_at ? "Resend" : "Send invoice"}</button> : <span className="text-slate-400">Complete</span>}</td></tr>;
                                })}</tbody>
                            </table>
                            {filtered.length === 0 && <p className="py-10 text-center text-slate-400">No invoices match the selected filters.</p>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
