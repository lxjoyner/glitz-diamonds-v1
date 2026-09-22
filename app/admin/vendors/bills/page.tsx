"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Bill = {
    id: number;
    vendor_id: number;
    vendor_name: string;
    bill_date: string;
    due_date: string;
    bill_number: string | null;
    currency: string;
    total_cents: number;
    amount_paid_cents: number;
    status: string;
};

const PAGE_SIZE = 25;
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100);

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const ref = useRef<HTMLInputElement | null>(null);
    return (
        <div className="relative">
            <input type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 pr-14 [&::-webkit-calendar-picker-indicator]:opacity-0" />
            <button type="button" onClick={() => ref.current?.showPicker()} className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200" aria-label={`Open ${label} date picker`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>
            </button>
            <input ref={ref} type="date" value={value} onChange={(e) => onChange(e.target.value)} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" />
        </div>
    );
}

export default function BillsPage() {
    const router = useRouter();
    const [bills, setBills] = useState<Bill[]>([]);
    const [vendorFilter, setVendorFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");

    async function loadBills() {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/vendor-bills/list", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to load bills.");
            setBills(data.bills || []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load bills.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        async function init() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) {
                setMessage("Only admins and treasurers can access bills.");
                setLoading(false);
                return;
            }
            await loadBills();
        }
        init();
    }, [router]);

    const vendors = useMemo(() => Array.from(new Map(bills.map((bill) => [bill.vendor_id, bill.vendor_name])).entries()), [bills]);
    const filtered = useMemo(() => bills.filter((bill) => {
        if (vendorFilter !== "all" && String(bill.vendor_id) !== vendorFilter) return false;
        const date = String(bill.bill_date).slice(0, 10);
        if (fromDate && date < fromDate) return false;
        if (toDate && date > toDate) return false;
        return true;
    }), [bills, vendorFilter, fromDate, toDate]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageStart = (page - 1) * PAGE_SIZE;
    const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    useEffect(() => { setPage(1); }, [vendorFilter, fromDate, toDate]);
    useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

    function openPayment(bill: Bill) {
        const due = Math.max(0, bill.total_cents - bill.amount_paid_cents);
        setPaymentBill(bill);
        setPaymentAmount((due / 100).toFixed(2));
    }

    async function recordPayment() {
        if (!paymentBill) return;
        const res = await fetch(`/api/admin/vendor-bills/${paymentBill.id}/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: Number(paymentAmount) }),
        });
        const data = await res.json();
        if (!res.ok) {
            setMessage(data?.error || "Failed to record payment.");
            return;
        }
        setPaymentBill(null);
        setPaymentAmount("");
        await loadBills();
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <h1 className="text-4xl font-bold tracking-tight">Bills</h1>
                    <Link href="/admin/vendors" className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Create a bill</Link>
                </div>

                <section className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr]">
                    <label className="grid gap-2">
                        <span className="font-semibold text-slate-600">Vendor</span>
                        <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-4 py-3">
                            <option value="all">All vendors</option>
                            {vendors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                        </select>
                    </label>
                    <div className="grid gap-2">
                        <span className="font-semibold text-slate-600">Bill date</span>
                        <div className="grid grid-cols-2 gap-2">
                            <DateFilter label="From" value={fromDate} onChange={setFromDate} />
                            <DateFilter label="To" value={toDate} onChange={setToDate} />
                        </div>
                    </div>
                </section>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto pb-32">
                        <table className="w-full min-w-[1100px] border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-left">
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4">Number</th>
                                    <th className="px-5 py-4">Vendor</th>
                                    <th className="px-5 py-4">Due date</th>
                                    <th className="px-5 py-4 text-right">Amount due</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading bills...</td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No bills found.</td></tr>
                                ) : paginated.map((bill) => {
                                    const dueCents = Math.max(0, bill.total_cents - bill.amount_paid_cents);
                                    const status = dueCents === 0 && bill.total_cents > 0 ? "Paid" : bill.amount_paid_cents > 0 ? "Partially Paid" : "Unpaid";
                                    return (
                                        <tr key={bill.id} className="border-b border-slate-100">
                                            <td className="px-5 py-4"><span className={`rounded-md px-4 py-1 text-sm font-bold ${status === "Paid" ? "bg-emerald-100 text-emerald-800" : status === "Partially Paid" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>{status}</span></td>
                                            <td className="px-5 py-4">{String(bill.bill_date).slice(0, 10)}</td>
                                            <td className="px-5 py-4">{bill.bill_number || ""}</td>
                                            <td className="px-5 py-4"><div>{bill.vendor_name}</div><div className="text-sm text-slate-500">Vendor</div></td>
                                            <td className="px-5 py-4">{String(bill.due_date).slice(0, 10)}</td>
                                            <td className="px-5 py-4 text-right"><div>{money(dueCents)}</div><div className="text-sm text-slate-500">Total {money(bill.total_cents)}</div></td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="inline-flex items-center gap-3">
                                                    <button type="button" onClick={() => openPayment(bill)} className="font-semibold text-blue-700 hover:underline">Record a payment</button>
                                                    <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50" aria-label={`Actions for bill ${bill.id}`}>⌄</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                            <p className="text-sm text-slate-500">Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}</p>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-blue-300 px-3 py-2 disabled:opacity-40">◀</button>
                                <span className="text-sm font-semibold">{page} / {pageCount}</span>
                                <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-lg border border-blue-300 px-3 py-2 disabled:opacity-40">▶</button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {paymentBill && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold">Record a payment</h2>
                        <p className="mt-2 text-slate-600">{paymentBill.vendor_name}</p>
                        <label className="mt-5 grid gap-2">
                            <span className="font-semibold">Payment amount</span>
                            <input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="rounded-xl border border-blue-300 px-4 py-3" />
                        </label>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setPaymentBill(null)} className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Cancel</button>
                            <button type="button" onClick={recordPayment} className="rounded-full bg-blue-700 px-5 py-2.5 font-semibold text-white">Record payment</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
