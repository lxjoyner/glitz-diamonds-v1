"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Contact = {
    id: number;
    name: string;
};

type TransactionRow = {
    id: number;
    transaction_date: string;
    invoice_id: number;
    invoice_number: string;
    member_id: number;
    customer_name: string;
    debit_cents: number;
    credit_cents: number;
    description: string;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100);

function dateOnly(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayLocal() {
    const d = new Date();
    return dateOnly(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function displayDate(value: string) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function AccountTransactionsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentYear = new Date().getFullYear();

    const initialMemberId = Number(searchParams.get("memberId") || 0);
    const initialType = searchParams.get("type") || "accrual";
    const initialFrom = searchParams.get("from") || dateOnly(currentYear, 1, 1);
    const initialTo = searchParams.get("to") || todayLocal();

    const [rows, setRows] = useState<TransactionRow[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [memberId, setMemberId] = useState(initialMemberId);
    const [reportType, setReportType] = useState(initialType);
    const [fromDate, setFromDate] = useState(initialFrom);
    const [toDate, setToDate] = useState(initialTo);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    async function loadReport(selectedMemberId = memberId) {
        if (!selectedMemberId) return;
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`/api/admin/reports/account-transactions?memberId=${selectedMemberId}&type=${reportType}&from=${fromDate}&to=${toDate}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to load transactions.");
            setRows(data.rows || []);
            setContacts(data.contacts || []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load transactions.");
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
                setMessage("Only admins and treasurers can access reports.");
                setLoading(false);
                return;
            }
            await loadReport();
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const customerName = contacts.find((contact) => contact.id === memberId)?.name || rows[0]?.customer_name || "Customer";
    const totals = useMemo(() => rows.reduce((acc, row) => ({
        debit: acc.debit + Number(row.debit_cents || 0),
        credit: acc.credit + Number(row.credit_cents || 0),
    }), { debit: 0, credit: 0 }), [rows]);

    let runningBalance = 0;

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Account Transactions</h1>
                        <p className="mt-1 text-sm text-slate-500">{customerName}</p>
                    </div>
                    <button type="button" onClick={() => window.print()} className="rounded-full border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-700">Export</button>
                </div>

                <section className="mb-8 rounded-2xl bg-slate-200/70 p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Account</span>
                            <select className="rounded-xl border border-blue-300 bg-white px-4 py-3">
                                <option>All Accounts</option>
                            </select>
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Date Range</span>
                            <select
                                value={String(new Date(fromDate + "T00:00:00").getFullYear())}
                                onChange={(e) => {
                                    const year = Number(e.target.value);
                                    setFromDate(dateOnly(year, 1, 1));
                                    setToDate(year === currentYear ? todayLocal() : dateOnly(year, 12, 31));
                                }}
                                className="rounded-xl border border-blue-300 bg-white px-4 py-3"
                            >
                                {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((year) => <option key={year}>{year}</option>)}
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">From</span>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-3 py-3" />
                            </label>
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">To</span>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-3 py-3" />
                            </label>
                        </div>

                        <button type="button" onClick={loadReport} className="self-end rounded-full bg-blue-700 px-6 py-3 font-semibold text-white">Update Report</button>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Report Type</span>
                            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-4 py-3">
                                <option value="accrual">Accrual (Paid & Unpaid)</option>
                                <option value="cash">Cash Basis (Paid)</option>
                                <option value="cash_only">Cash Only</option>
                            </select>
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Contact</span>
                            <select
                                className="rounded-xl border border-blue-300 bg-white px-4 py-3"
                                value={memberId}
                                onChange={(e) => {
                                    const nextMemberId = Number(e.target.value);
                                    setMemberId(nextMemberId);
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("memberId", String(nextMemberId));
                                    params.set("type", reportType);
                                    params.set("from", fromDate);
                                    params.set("to", toDate);
                                    router.replace(`/admin/reports/account-transactions?${params.toString()}`);
                                }}
                            >
                                {contacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </section>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-left">
                                <th className="px-5 py-4">DATE</th>
                                <th className="px-5 py-4">DESCRIPTION</th>
                                <th className="px-5 py-4 text-right">DEBIT</th>
                                <th className="px-5 py-4 text-right">CREDIT</th>
                                <th className="px-5 py-4 text-right">BALANCE</th>
                            </tr>
                            <tr className="bg-slate-200/80">
                                <th colSpan={5} className="px-5 py-4 text-left">
                                    <div className="font-semibold">Cash on Hand</div>
                                    <div className="text-sm font-normal text-slate-600">Under: Asset &gt; Cash and Bank</div>
                                </th>
                            </tr>
                            <tr className="bg-slate-100">
                                <th className="px-5 py-3 text-left" colSpan={4}>Starting Balance</th>
                                <th className="px-5 py-3 text-right">{money(0)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading transactions...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No transactions found for this selection.</td></tr>
                            ) : rows.map((row) => {
                                runningBalance += Number(row.credit_cents || 0) - Number(row.debit_cents || 0);
                                return (
                                    <tr key={`${row.id}-${row.transaction_date}`} className="border-b border-slate-100">
                                        <td className="px-5 py-4">{displayDate(row.transaction_date)}</td>
                                        <td className="px-5 py-4 font-semibold text-blue-700">{row.description}</td>
                                        <td className="px-5 py-4 text-right">{row.debit_cents ? money(row.debit_cents) : ""}</td>
                                        <td className="px-5 py-4 text-right">{row.credit_cents ? money(row.credit_cents) : ""}</td>
                                        <td className="px-5 py-4 text-right">{money(runningBalance)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 font-bold">
                                <td colSpan={2} className="px-5 py-4">Totals and Ending Balance</td>
                                <td className="px-5 py-4 text-right">{money(totals.debit)}</td>
                                <td className="px-5 py-4 text-right">{money(totals.credit)}</td>
                                <td className="px-5 py-4 text-right">{money(totals.credit - totals.debit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>
            </div>
        </main>
    );
}

export default function AccountTransactionsPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
                    <div className="mx-auto max-w-[1500px]">
                        <h1 className="text-4xl font-bold tracking-tight">Account Transactions</h1>
                        <p className="mt-6 text-slate-500">Loading report...</p>
                    </div>
                </main>
            }
        >
            <AccountTransactionsContent />
        </Suspense>
    );
}
