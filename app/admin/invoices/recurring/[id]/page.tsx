"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InvoiceDatePicker from "@/components/InvoiceDatePicker";

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

type InvoiceSettings = {
    business_name?: string;
    business_address?: string;
    business_phone?: string;
    business_email?: string;
    has_logo?: boolean | number;
};

type Frequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";
type EndMode = "after" | "on" | "never";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
const displayDate = (value: string | null) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US") : "—";
const ordinal = (value: number) => {
    if (value === 1) return "First";
    if (value === 31) return "31st";
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return `${value}st`;
    if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
    return `${value}th`;
};

const dayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const timeZones = [
    "US/Eastern",
    "US/Central",
    "US/Mountain",
    "US/Pacific",
    "US/Alaska",
    "US/Hawaii",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "UTC",
];

export default function RecurringInvoiceDetailsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<RecurringInvoice | null>(null);
    const [settings, setSettings] = useState<InvoiceSettings>({ business_name: "Glitz Of Diamonds" });
    const [error, setError] = useState("");
    const [frequency, setFrequency] = useState<Frequency>("monthly");
    const [weeklyDay, setWeeklyDay] = useState("Thursday");
    const [monthlyDay, setMonthlyDay] = useState("First");
    const [yearlyMonth, setYearlyMonth] = useState("September");
    const [yearlyDay, setYearlyDay] = useState("10th");
    const [customEvery, setCustomEvery] = useState(1);
    const [customUnit, setCustomUnit] = useState("Month(s)");
    const [customDay, setCustomDay] = useState("First");
    const [firstInvoiceDate, setFirstInvoiceDate] = useState("");
    const [endMode, setEndMode] = useState<EndMode>("never");
    const [endValue, setEndValue] = useState(1);
    const [endDate, setEndDate] = useState("");
    const [timeZone, setTimeZone] = useState("US/Central");

    const monthlyDayOptions = useMemo(() => ["First", "Last", ...Array.from({ length: 30 }, (_, index) => ordinal(index + 2))], []);
    const yearlyDayOptions = useMemo(() => ["First", "Last", ...Array.from({ length: 29 }, (_, index) => ordinal(index + 2))], []);

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");

            const [res, settingsRes] = await Promise.all([
                fetch(`/api/admin/recurring-invoices/${params.id}`, { cache: "no-store" }),
                fetch("/api/admin/invoice-settings", { cache: "no-store" }),
            ]);

            const data = await res.json();
            if (!res.ok) return setError(data?.error || "Failed to load recurring invoice.");
            const recurring = data.recurringInvoice as RecurringInvoice;
            setInvoice(recurring);
            setFirstInvoiceDate(String(recurring.first_invoice_date || "").slice(0, 10));
            setMonthlyDay(ordinal(Number(recurring.repeat_day || 1)));
            setEndMode(recurring.end_date ? "on" : "never");
            setEndDate(recurring.end_date ? String(recurring.end_date).slice(0, 10) : "");

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                if (settingsData?.settings) setSettings(settingsData.settings);
            }
        }
        load();
    }, [params.id, router]);

    function renderFrequencyDetails() {
        if (frequency === "daily") {
            return <span className="text-slate-600">The invoice will be created and sent every day.</span>;
        }
        if (frequency === "weekly") {
            return <><span>every</span><select value={weeklyDay} onChange={(e) => setWeeklyDay(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{dayOptions.map((day) => <option key={day}>{day}</option>)}</select></>;
        }
        if (frequency === "monthly") {
            return <><span>on the</span><select value={monthlyDay} onChange={(e) => setMonthlyDay(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{monthlyDayOptions.map((day) => <option key={day}>{day}</option>)}</select><span>day of every month</span></>;
        }
        if (frequency === "yearly") {
            return <div className="flex flex-wrap items-center gap-3"><span>every</span><select value={yearlyMonth} onChange={(e) => setYearlyMonth(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{monthOptions.map((month) => <option key={month}>{month}</option>)}</select><span>on the</span><select value={yearlyDay} onChange={(e) => setYearlyDay(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{yearlyDayOptions.map((day) => <option key={day}>{day}</option>)}</select><span>day of the month</span></div>;
        }
        return <div className="flex flex-wrap items-center gap-3"><span>every</span><input type="number" min="1" value={customEvery} onChange={(e) => setCustomEvery(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded-lg border border-slate-300 px-3 py-2"/><select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2"><option>Day(s)</option><option>Week(s)</option><option>Month(s)</option><option>Year(s)</option></select><span>on the</span><select value={customDay} onChange={(e) => setCustomDay(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">{yearlyDayOptions.map((day) => <option key={day}>{day}</option>)}</select><span>day of the month</span></div>;
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Recurring invoice</h1>
                    <div className="flex gap-3">
                        <button type="button" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">More actions⌄</button>
                        <Link href="/admin/invoices/recurring/new" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Create another recurring invoice</Link>
                    </div>
                </header>

                {error ? <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p> : !invoice ? <p className="rounded-lg bg-white p-6 text-slate-500 shadow-sm">Loading...</p> : (
                    <div className="space-y-5">
                        <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-4">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><p className="mt-2 capitalize">{invoice.status}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p><p className="mt-2 text-lg font-semibold text-blue-700">{invoice.member_name || "Member"}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice amount</p><p className="mt-2 text-xl">{money(invoice.amount_cents)}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created to date</p><p className="mt-2 text-xl">0 invoices</p></div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">✓</span><div><h2 className="text-xl font-medium">Create invoice</h2><p className="mt-1 text-sm"><strong>Created on:</strong> {displayDate(invoice.first_invoice_date)}</p><p className="text-sm"><strong>Payment terms:</strong> On Receipt</p></div></div><Link href={`/admin/invoices/recurring/${invoice.id}/edit`} className="rounded-full border border-blue-600 px-6 py-2 font-semibold text-blue-700">Edit</Link></div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4"><span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-600 text-lg text-blue-700">2</span><h2 className="text-xl font-medium">Set schedule</h2></div>
                                <Link href={`/admin/invoices/recurring/${invoice.id}/edit`} className="rounded-full bg-blue-600 px-6 py-2 font-semibold text-white">Save</Link>
                            </div>
                            {new Date(`${String(firstInvoiceDate).slice(0, 10)}T00:00:00`).getTime() < new Date().setHours(0,0,0,0) ? (
                                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">The date of your first invoice must be set to today or in the future.</div>
                            ) : null}
                            <div className="mx-auto max-w-4xl space-y-4 text-sm">
                                <div className="flex flex-wrap items-center gap-3"><span>Repeat this invoice</span><select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="rounded-lg border border-slate-300 px-3 py-2"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="custom">Custom</option></select>{renderFrequencyDetails()}</div>
                                <div className="flex flex-wrap items-center gap-3"><span>Create first invoice on</span><div className="min-w-[220px]"><InvoiceDatePicker ariaLabel="First invoice" value={firstInvoiceDate} onChange={setFirstInvoiceDate} className="w-full" /></div><span>and end</span><select value={endMode} onChange={(e) => setEndMode(e.target.value as EndMode)} className="rounded-lg border border-slate-300 px-3 py-2"><option value="after">After</option><option value="on">On</option><option value="never">Never</option></select>{endMode === "after" ? <><input type="number" min="1" value={endValue} onChange={(e) => setEndValue(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded-lg border border-slate-300 px-3 py-2"/><span>invoice(s)</span></> : null}{endMode === "on" ? <div className="min-w-[220px]"><InvoiceDatePicker ariaLabel="End date" value={endDate} onChange={setEndDate} className="w-full" /></div> : null}</div>
                                <div className="flex flex-wrap items-center gap-3"><span>Create in</span><select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="min-w-[220px] rounded-lg border border-slate-300 px-3 py-2">{timeZones.map((zone) => <option key={zone}>{zone}</option>)}</select><span>time zone</span></div>
                                <p className="ml-0 text-xs text-slate-500 md:ml-32">Set a time zone to ensure invoice delivery in the morning based on the recipient&apos;s time zone.</p>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">✓</span><div><h2 className="text-xl font-medium">Get paid</h2><p className="mt-1 text-sm"><strong>Manual payments:</strong> Your customer will manually pay each recurring invoice.</p><p className="text-sm"><strong>Credit Card Payments:</strong> Disabled</p></div></div><button type="button" className="rounded-full border border-blue-200 px-6 py-2 font-semibold text-blue-300">Edit</button></div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4"><div className="flex gap-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">✓</span><div><h2 className="text-xl font-medium">Send</h2><p className="mt-1 text-sm"><strong>Automatic sending:</strong> Email the invoice automatically to {invoice.member_email || "the customer"} when the invoice is generated.</p></div></div><button type="button" className="rounded-full border border-blue-200 px-6 py-2 font-semibold text-blue-300">Edit</button></div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="grid gap-6 border-b border-slate-200 p-6 md:grid-cols-2">
                                <div>{settings.has_logo ? <img src="/api/invoice-logo" alt="Glitz Of Diamonds invoice logo" className="h-40 max-w-64 object-contain" /> : <div className="flex h-36 w-48 items-center justify-center rounded bg-slate-100 text-center text-slate-500">No invoice logo</div>}</div>
                                <div className="text-right"><p className="text-4xl font-light">INVOICE</p><p className="mt-1 text-sm font-semibold">{settings.business_name || "Glitz Of Diamonds"}</p>{settings.business_address ? <p className="whitespace-pre-line text-xs">{settings.business_address}</p> : null}{settings.business_phone ? <p className="text-xs">{settings.business_phone}</p> : null}{settings.business_email ? <p className="text-xs">{settings.business_email}</p> : null}</div>
                            </div>
                            <div className="grid gap-8 p-6 md:grid-cols-2">
                                <div><p className="text-xs font-semibold">Bill to</p><p className="mt-1 font-semibold">{invoice.member_name}</p><p className="mt-3 text-sm">{invoice.member_email}</p></div>
                                <div className="space-y-2 text-sm md:text-right"><p><strong>Invoice Number:</strong> <span className="ml-3">Auto-generated</span></p><p><strong>Invoice Date:</strong> <span className="ml-3">Auto-generated</span></p><p><strong>Payment Due:</strong> <span className="ml-3">Auto-generated</span></p><p className="bg-slate-50 py-2"><strong>Amount Due (USD):</strong> <span className="ml-3 font-bold">{money(invoice.amount_cents)}</span></p></div>
                            </div>
                            <div className="grid grid-cols-[1fr_100px_120px_120px] gap-3 bg-red-600 px-6 py-3 text-sm font-semibold text-white"><span>Items</span><span>Quantity</span><span className="text-right">Price</span><span className="text-right">Amount</span></div>
                            <div className="grid grid-cols-[1fr_100px_120px_120px] gap-3 border-b border-slate-200 px-6 py-4 text-sm"><div><p>Dues</p><p className="text-xs text-slate-500">Glitz Of Diamonds</p></div><span>1</span><span className="text-right">{money(invoice.amount_cents)}</span><span className="text-right">{money(invoice.amount_cents)}</span></div>
                            <div className="ml-auto max-w-sm space-y-3 p-6 text-sm"><div className="flex justify-between"><strong>Total:</strong><span>{money(invoice.amount_cents)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3"><strong>Amount Due (USD):</strong><strong>{money(invoice.amount_cents)}</strong></div></div>
                            <div className="p-6"><p className="text-sm font-semibold">Notes / Terms</p><p className="mt-3 whitespace-pre-line text-sm">{invoice.notes || ""}</p></div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
