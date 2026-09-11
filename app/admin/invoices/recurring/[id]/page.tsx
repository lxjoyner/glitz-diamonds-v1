"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RecurringInvoice = {
    id: number;
    member_name: string | null;
    member_email: string | null;
    status: string;
    repeat_day: number;
    first_invoice_date: string;
    next_invoice_date: string;
    previous_invoice_date: string | null;
    end_date: string | null;
    amount_cents: number;
    notes: string | null;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
const displayDate = (value: string | null) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US") : "—";
const ordinal = (day: number) => day === 1 ? "First" : day === 2 ? "Second" : day === 3 ? "Third" : `${day}th`;

export default function RecurringInvoiceDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<RecurringInvoice | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            const res = await fetch(`/api/admin/recurring-invoices/${params.id}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) return setError(data?.error || "Failed to load recurring invoice.");
            setInvoice(data.recurringInvoice);
        }
        load();
    }, [params.id, router]);

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Recurring invoice</h1>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">More actions⌄</button>
                        <Link href="/admin/invoices/recurring/new" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Create another recurring invoice</Link>
                    </div>
                </header>

                {error ? <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p> : !invoice ? <p className="rounded-xl bg-white p-6 shadow-sm">Loading...</p> : (
                    <div className="space-y-4">
                        <section className="grid gap-6 border-y border-slate-200 bg-white px-6 py-6 shadow-sm md:grid-cols-4">
                            <div><p className="text-xs font-semibold text-slate-500">Status</p><span className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-bold ${invoice.status === "draft" ? "bg-slate-200 text-slate-700" : invoice.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{invoice.status === "active" ? "Active" : invoice.status === "draft" ? "Draft" : "Ended"}</span></div>
                            <div><p className="text-xs font-semibold text-slate-500">Customer</p><p className="mt-2 font-semibold text-blue-700">{invoice.member_name || "—"}</p></div>
                            <div><p className="text-xs font-semibold text-slate-500">Invoice amount</p><p className="mt-2 text-xl">{money(invoice.amount_cents)}</p></div>
                            <div><p className="text-xs font-semibold text-slate-500">Created to date</p><p className="mt-2 text-xl">0 invoices</p></div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">✓</span>
                                    <div>
                                        <h2 className="text-xl font-medium">Create invoice</h2>
                                        <p className="mt-1 text-sm"><strong>Created on:</strong> {displayDate(invoice.first_invoice_date)}</p>
                                        <p className="text-sm"><strong>Payment terms:</strong> On Receipt</p>
                                    </div>
                                </div>
                                <Link href={`/admin/invoices/recurring/${invoice.id}/edit`} className="rounded-full border border-blue-600 bg-white px-6 py-2 font-semibold text-blue-700">Edit</Link>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                            <div className="mb-5 flex items-center justify-between">
                                <div className="flex items-center gap-4"><span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-600 text-lg text-blue-700">2</span><h2 className="text-xl font-medium">Set schedule</h2></div>
                                <Link href={`/admin/invoices/recurring/${invoice.id}/edit`} className="rounded-full bg-blue-600 px-6 py-2 font-semibold text-white">Save</Link>
                            </div>
                            {new Date(`${String(invoice.first_invoice_date).slice(0, 10)}T00:00:00`).getTime() < new Date().setHours(0,0,0,0) ? (
                                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">The date of your first invoice must be set to today or in the future.</div>
                            ) : null}
                            <div className="mx-auto max-w-3xl space-y-4 text-sm">
                                <div className="flex flex-wrap items-center gap-3"><span>Repeat this invoice</span><select className="rounded-lg border border-slate-300 px-3 py-2"><option>Monthly</option></select><span>on the</span><select className="rounded-lg border border-slate-300 px-3 py-2" value={ordinal(invoice.repeat_day)} readOnly><option>{ordinal(invoice.repeat_day)}</option></select><span>day of every month</span></div>
                                <div className="flex flex-wrap items-center gap-3"><span>Create first invoice on</span><input type="date" value={String(invoice.first_invoice_date).slice(0,10)} readOnly className="rounded-lg border border-slate-300 px-3 py-2"/><span>and end</span><select className="rounded-lg border border-slate-300 px-3 py-2"><option>{invoice.end_date ? displayDate(invoice.end_date) : "Never"}</option></select></div>
                                <div className="flex flex-wrap items-center gap-3"><span>Create in</span><select className="rounded-lg border border-slate-300 px-3 py-2"><option>US/Central</option></select><span>time zone</span></div>
                                <p className="ml-32 text-xs text-slate-500">Set a time zone to ensure invoice delivery in the morning based on the recipient&apos;s time zone.</p>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">✓</span><div><h2 className="text-xl font-medium">Get paid</h2><p className="mt-1 text-sm"><strong>Manual payments:</strong> Your customer will manually pay each recurring invoice.</p><p className="text-sm"><strong>Credit Card Payments:</strong> Disabled</p></div></div><button type="button" className="rounded-full border border-blue-200 px-6 py-2 font-semibold text-blue-300">Edit</button></div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">✓</span><div><h2 className="text-xl font-medium">Send</h2><p className="mt-1 text-sm"><strong>Automatic sending:</strong> Email the invoice automatically to {invoice.member_email || "the customer"} when the invoice is generated.</p></div></div><button type="button" className="rounded-full border border-blue-200 px-6 py-2 font-semibold text-blue-300">Edit</button></div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                            <div className="flex items-start justify-between gap-8 border-b border-slate-200 p-6">
                                <div className="flex h-40 w-52 items-center justify-center bg-black text-center text-white"><div><p className="text-2xl font-bold">GLITZ OF DIAMONDS</p><p className="text-sm">Est. 2023</p></div></div>
                                <div className="text-right"><p className="text-3xl font-light">INVOICE</p><p className="mt-2 font-semibold">Glitz Of Diamonds</p><p className="text-sm">United States</p></div>
                            </div>
                            <div className="grid gap-8 p-6 md:grid-cols-2">
                                <div><p className="text-sm font-semibold">Bill to</p><p className="mt-1 font-semibold">{invoice.member_name || "—"}</p><p className="text-sm">{invoice.member_email || ""}</p></div>
                                <div className="md:text-right"><p className="text-sm"><strong>Invoice Number:</strong> Auto-generated</p><p className="text-sm"><strong>Invoice Date:</strong> Auto-generated</p><p className="text-sm"><strong>Payment Due:</strong> Auto-generated</p><p className="mt-2 bg-slate-50 py-2 text-sm"><strong>Amount Due (USD):</strong> &nbsp; {money(invoice.amount_cents)}</p></div>
                            </div>
                            <div className="grid grid-cols-[1fr_100px_120px_120px] bg-red-600 px-6 py-3 text-sm font-semibold text-white"><span>Items</span><span className="text-right">Quantity</span><span className="text-right">Price</span><span className="text-right">Amount</span></div>
                            <div className="grid grid-cols-[1fr_100px_120px_120px] border-b border-slate-200 px-6 py-3 text-sm"><div><p className="font-medium">Dues</p><p>Glitz Of Diamonds</p></div><span className="text-right">1</span><span className="text-right">{money(invoice.amount_cents)}</span><span className="text-right">{money(invoice.amount_cents)}</span></div>
                            <div className="ml-auto w-full max-w-sm space-y-3 p-6 text-sm"><div className="flex justify-between"><strong>Total:</strong><span>{money(invoice.amount_cents)}</span></div><div className="flex justify-between border-t border-slate-300 pt-3"><strong>Amount Due (USD):</strong><strong>{money(invoice.amount_cents)}</strong></div></div>
                            {invoice.notes ? <div className="px-6 pb-8"><p className="text-sm font-semibold">Notes / Terms</p><p className="mt-2 whitespace-pre-line text-sm">{invoice.notes}</p></div> : null}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
