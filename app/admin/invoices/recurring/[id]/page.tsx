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
                    <h1 className="text-4xl font-bold tracking-tight text-white">Recurring invoice details</h1>
                    <div className="flex gap-3">
                        <Link href="/admin/invoices/recurring" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Back</Link>
                        {invoice && <Link href={`/admin/invoices/recurring/${invoice.id}/edit`} className="rounded-full bg-black px-6 py-2.5 font-semibold text-white">Edit</Link>}
                    </div>
                </header>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    {error ? <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p> : !invoice ? <p>Loading...</p> : (
                        <div className="grid gap-6 md:grid-cols-2">
                            <div><p className="text-sm font-semibold text-slate-500">Customer</p><p className="mt-1 text-xl font-semibold">{invoice.member_name}</p><p className="text-sm text-slate-500">{invoice.member_email}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">Status</p><p className="mt-1 text-xl capitalize">{invoice.status}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">Schedule</p><p className="mt-1">Repeat monthly on day {invoice.repeat_day}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">Invoice amount</p><p className="mt-1 text-xl font-semibold">{money(invoice.amount_cents)}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">First invoice</p><p className="mt-1">{displayDate(invoice.first_invoice_date)}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">Previous invoice</p><p className="mt-1">{displayDate(invoice.previous_invoice_date)}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">Next invoice</p><p className="mt-1">{displayDate(invoice.next_invoice_date)}</p></div>
                            <div><p className="text-sm font-semibold text-slate-500">Ends</p><p className="mt-1">{invoice.end_date ? displayDate(invoice.end_date) : "Never"}</p></div>
                            {invoice.notes && <div className="md:col-span-2"><p className="text-sm font-semibold text-slate-500">Notes</p><p className="mt-1 whitespace-pre-line">{invoice.notes}</p></div>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
