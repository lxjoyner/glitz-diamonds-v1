"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Payment = { id: number; amount_cents: number; payment_date: string; method: string; account_name: string; memo: string | null };
type Reversal = { original_payment_id: number; amount_cents: number; reason: string; reversed_by: string; reversed_at: string };
type InvoiceInfo = { id: number; invoiceNumber: string; memberName: string; status: string; totalCents: number; amountPaidCents: number };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0) / 100);

export default function ReverseInvoicePaymentPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [reversals, setReversals] = useState<Reversal[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function load() {
        const res = await fetch("/api/admin/invoices/" + id + "/reverse-payment", { cache: "no-store" });
        if (res.status === 401) { router.push("/admin/login"); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load invoice payments.");
        setInvoice(data.invoice);
        setPayments(data.payments || []);
        setReversals(data.reversals || []);
        setSelectedId(null);
    }
    useEffect(() => {
        void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load payments."))
            .finally(() => setLoading(false));
        // Invoice ID remains stable for the page lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function reverse() {
        const payment = payments.find((item) => item.id === selectedId);
        if (!payment || reason.trim().length < 10) return;
        const confirmed = window.confirm(
            "Reverse the " + money(payment.amount_cents) + " payment recorded on " + payment.payment_date +
            " for invoice " + invoice?.invoiceNumber + "?\n\n" +
            "This changes outstanding balances and financial reports. It does not refund funds or retract sent receipts."
        );
        if (!confirmed) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const res = await fetch("/api/admin/invoices/" + id + "/reverse-payment", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId: payment.id, reason: reason.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unable to reverse payment.");
            setReason("");
            await load();
            setMessage("Payment reversed. The invoice paid amount, status, and reports now use the corrected payment ledger.");
            router.refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to reverse payment.");
        } finally { setBusy(false); }
    }

    return <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-3xl space-y-6">
            <Link href="/admin/invoices" className="font-semibold text-blue-700 underline">Back to Invoices</Link>
            <header className="rounded-xl border border-white/20 bg-gradient-to-r from-red-800 via-red-950 to-red-800 p-6 text-white shadow-sm">
                <h1 className="text-2xl font-bold !text-white">Reverse an Incorrect Invoice Payment</h1>
                {invoice && <>
                    <p className="mt-2 !text-red-100">{invoice.invoiceNumber} · {invoice.memberName}</p>
                    <div className="mt-3 grid gap-2 text-sm !text-white sm:grid-cols-3">
                        <p className="!text-white">Invoice total: <strong>{money(invoice.totalCents)}</strong></p>
                        <p className="!text-white">Currently paid: <strong>{money(invoice.amountPaidCents)}</strong></p>
                        <p className="!text-white">Outstanding: <strong>{money(Math.max(0, invoice.totalCents - invoice.amountPaidCents))}</strong></p>
                    </div>
                </>}
            </header>
            {loading && <p>Loading payment history...</p>}
            {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-red-800">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-green-100 p-3 text-green-800">{message}</p>}
            {!loading && <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold">Select the payment recorded in error</h2>
                {payments.length === 0 && <p className="mt-3 text-slate-600">No individually recorded payments are available to reverse. Historical imported paid amounts cannot be reversed here.</p>}
                <div className="mt-4 space-y-3">
                    {payments.map((payment) => <label key={payment.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
                        <input type="radio" name="payment" checked={selectedId === payment.id} onChange={() => setSelectedId(payment.id)} className="peer sr-only" />
                        <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-500 bg-white peer-checked:border-blue-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600">
                            {selectedId === payment.id && <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />}
                        </span>
                        <span>
                            <strong>{money(payment.amount_cents)}</strong> · {payment.payment_date}
                            <span className="block text-sm text-slate-600">{payment.method} · {payment.account_name}</span>
                            {payment.memo && <span className="block text-sm text-slate-600">{payment.memo}</span>}
                        </span>
                    </label>)}
                </div>
                {payments.length > 0 && <div className="mt-5 space-y-3">
                    <label className="block font-medium">Reason for reversal (required)
                        <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
                            placeholder="Example: Payment was accidentally recorded against the wrong invoice."
                            className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
                    </label>
                    <p className="text-sm text-amber-800">Financial reports and balances will reflect the reversal. Prior customer emails remain sent; this action does not issue a refund. Check the actual payment account separately.</p>
                    <button type="button" disabled={busy || selectedId === null || reason.trim().length < 10} onClick={() => void reverse()}
                        className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        {busy ? "Reversing..." : "Confirm payment reversal"}
                    </button>
                </div>}
            </section>}
            {reversals.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold">Reversal audit history</h2>
                <div className="mt-3 space-y-3">{reversals.map((item) => <div key={item.original_payment_id} className="border-t border-slate-200 pt-3 text-sm">
                    <p className="font-semibold">{money(item.amount_cents)} reversed by {item.reversed_by} on {item.reversed_at}</p>
                    <p className="text-slate-600">{item.reason}</p>
                </div>)}</div>
            </section>}
        </div>
    </main>;
}
