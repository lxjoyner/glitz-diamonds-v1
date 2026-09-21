"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Invoice = {
    id: number;
    invoice_number: string;
    member_name: string | null;
    total_cents: number;
    amount_paid_cents: number;
};

const METHODS = ["Bank payment", "Cash", "Check", "Credit card", "PayPal", "Other"];
const ACCOUNTS = ["Cash on Hand (USD)", "Wave Payroll Clearing (USD)"];

function today() {
    return new Date().toISOString().slice(0, 10);
}

export default function RecordPaymentPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [paymentDate, setPaymentDate] = useState(today());
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("");
    const [accountName, setAccountName] = useState("");
    const [memo, setMemo] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) return setMessage("Only admins and treasurers can record invoice payments.");

            const res = await fetch(`/api/admin/invoices/${params.id}/payments`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) return setMessage(data?.error || "Failed to load invoice.");
            setInvoice(data.invoice);
            const remaining = Math.max(0, Number(data.invoice.total_cents || 0) - Number(data.invoice.amount_paid_cents || 0));
            setAmount((remaining / 100).toFixed(2));
        }
        load();
    }, [params.id, router]);

    const remainingCents = useMemo(() => invoice ? Math.max(0, Number(invoice.total_cents) - Number(invoice.amount_paid_cents)) : 0, [invoice]);
    const paymentCents = Math.round(Number(amount || 0) * 100);
    const fullyPaid = invoice && paymentCents > 0 && paymentCents >= remainingCents;

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setMessage("");
        if (!paymentDate || !amount || !method || !accountName) return setMessage("Complete the payment date, amount, method, and account.");
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/invoices/${params.id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentDate, amount: Number(amount), method, accountName, memo }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to record payment.");
            router.push("/admin/invoices");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to record payment.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                        <h1 className="text-2xl font-semibold">Record a payment for this invoice</h1>
                        {invoice && <p className="mt-1 text-sm text-slate-500">{invoice.invoice_number} · {invoice.member_name || "Member"}</p>}
                    </div>
                    <Link href="/admin/invoices" className="text-3xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</Link>
                </div>

                <form onSubmit={submit} className="space-y-6 p-6 sm:p-8">
                    <label className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
                        <span className="font-semibold text-slate-600 sm:text-right">Date</span>
                        <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="rounded-xl border border-blue-200 px-4 py-3" />
                    </label>

                    <div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-start">
                        <span className="pt-3 font-semibold text-slate-600 sm:text-right">Amount</span>
                        <div>
                            <div className="flex items-center rounded-xl border border-emerald-600 px-4 py-3">
                                <span className="mr-2 text-slate-500">$</span>
                                <input type="number" min="0.01" step="0.01" max={(remainingCents / 100).toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full outline-none" />
                            </div>
                            {fullyPaid && <p className="mt-1 text-sm font-medium text-emerald-700">Invoice will be fully paid</p>}
                            {!fullyPaid && paymentCents > 0 && <p className="mt-1 text-sm text-slate-500">Remaining after payment: {((remainingCents - paymentCents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>}
                        </div>
                    </div>

                    <label className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
                        <span className="font-semibold text-slate-600 sm:text-right">Method</span>
                        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-xl border border-blue-200 px-4 py-3 italic text-slate-700">
                            <option value="">Select a payment method...</option>
                            {METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>

                    <div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-start">
                        <span className="pt-3 font-semibold text-slate-600 sm:text-right">Account</span>
                        <div>
                            <select value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full rounded-xl border border-blue-200 px-4 py-3 italic text-slate-700">
                                <option value="">Select a payment account...</option>
                                {ACCOUNTS.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <p className="mt-2 text-sm text-slate-500">Choose the account where the payment was deposited.</p>
                        </div>
                    </div>

                    <label className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-start">
                        <span className="pt-3 font-semibold text-slate-600 sm:text-right">Memo (on receipt)</span>
                        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} className="rounded-xl border border-blue-200 p-3" />
                    </label>

                    {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <Link href="/admin/invoices" className="rounded-full border border-blue-600 px-6 py-3 font-semibold text-blue-700">Cancel</Link>
                        <button type="submit" disabled={saving || !invoice || remainingCents <= 0} className="rounded-full bg-blue-600 px-7 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-200">{saving ? "Submitting..." : "Submit"}</button>
                    </div>
                </form>
            </div>
        </main>
    );
}
