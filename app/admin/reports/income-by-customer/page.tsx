"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ReportRow = {
    member_id: number;
    customer_name: string;
    all_income_cents: number;
    paid_income_cents: number;
};

type RangePreset = {
    label: string;
    from: string;
    to: string;
};

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100);

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function dateOnly(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayLocal() {
    const d = new Date();
    return dateOnly(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function buildPresets(): RangePreset[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const presets: RangePreset[] = [];

    for (let year = currentYear; year >= currentYear - 4; year -= 1) {
        presets.push({ label: String(year), from: dateOnly(year, 1, 1), to: dateOnly(year, 12, 31) });
    }

    for (let year = currentYear; year >= currentYear - 2; year -= 1) {
        for (let q = 4; q >= 1; q -= 1) {
            if (year === currentYear && q > Math.floor(now.getMonth() / 3) + 1) continue;
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            const endDay = new Date(year, endMonth, 0).getDate();
            presets.push({ label: `Q${q} ${year}`, from: dateOnly(year, startMonth, 1), to: dateOnly(year, endMonth, endDay) });
        }
    }

    for (let offset = 0; offset < 18; offset += 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const endDay = new Date(year, month, 0).getDate();
        presets.push({
            label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
            from: dateOnly(year, month, 1),
            to: dateOnly(year, month, endDay),
        });
    }

    return presets;
}

export default function IncomeByCustomerPage() {
    const router = useRouter();
    const presets = useMemo(buildPresets, []);
    const currentYear = String(new Date().getFullYear());
    const defaultPreset = presets.find((item) => item.label === currentYear)!;

    const [rows, setRows] = useState<ReportRow[]>([]);
    const [rangeValue, setRangeValue] = useState(currentYear);
    const [fromDate, setFromDate] = useState(defaultPreset.from);
    const [toDate, setToDate] = useState(todayLocal());
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [exportOpen, setExportOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement | null>(null);

    async function loadReport(from = fromDate, to = toDate) {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`/api/admin/reports/income-by-customer?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to load report.");
            setRows(data.rows || []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load report.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        function closeExportMenu(event: MouseEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) setExportOpen(false);
        }
        document.addEventListener("mousedown", closeExportMenu);
        return () => document.removeEventListener("mousedown", closeExportMenu);
    }, []);

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
            await loadReport(defaultPreset.from, todayLocal());
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    function applyPreset(value: string) {
        setRangeValue(value);
        if (value === "custom") return;
        const preset = presets.find((item) => item.label === value);
        if (!preset) return;
        setFromDate(preset.from);
        const end = preset.to > todayLocal() ? todayLocal() : preset.to;
        setToDate(end);
    }

    function exportCsv() {
        const header = ["Customer", "All Income", "Paid Income"];
        const lines = [
            header,
            ...rows.map((row) => [row.customer_name, (Number(row.all_income_cents) / 100).toFixed(2), (Number(row.paid_income_cents) / 100).toFixed(2)]),
        ];
        const csv = lines.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `income-by-customer-${fromDate}-to-${toDate}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }


    function exportPdf() {
        const reportWindow = window.open("", "_blank");
        if (!reportWindow) {
            setMessage("Allow pop-ups to export the report as PDF.");
            return;
        }

        try {
            reportWindow.opener = null;
        } catch {
            // Some browsers prevent changing opener. The report still remains usable.
        }

        const tableRows = rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.customer_name)}</td>
                <td style="text-align:right">${money(row.all_income_cents)}</td>
                <td style="text-align:right">${money(row.paid_income_cents)}</td>
            </tr>
        `).join("");

        reportWindow.document.open();
        reportWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Income by Customer</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
                    .brand-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #111827; }
                    .brand-logo { width: 70px; height: auto; }
                    .brand-title { font-size: 24px; font-weight: 700; margin: 0; }
                    h1 { margin: 0 0 4px 0; font-size: 22px; }
                    .range { color: #6b7280; margin-bottom: 24px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px 8px; border-bottom: 1px solid #d1d5db; }
                    th { text-align: left; background: #e5e7eb; }
                    tfoot td { font-weight: 700; border-top: 2px solid #111827; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="brand-header">
                    <img class="brand-logo" src="/GlitzOfDiamond_Logo.png" alt="Glitz Of Diamonds logo" />
                    <div>
                        <div class="brand-title">Glitz Of Diamonds</div>
                        <h1>Income by Customer</h1>
                    </div>
                </div>
                <div class="range">Date range: ${escapeHtml(fromDate)} to ${escapeHtml(toDate)}</div>
                <table>
                    <thead>
                        <tr><th>Customer</th><th style="text-align:right">All Income</th><th style="text-align:right">Paid Income</th></tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                    <tfoot>
                        <tr>
                            <td>Total Income</td>
                            <td style="text-align:right">${money(totals.all)}</td>
                            <td style="text-align:right">${money(totals.paid)}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);
        reportWindow.document.close();

        window.setTimeout(() => {
            reportWindow.focus();
            reportWindow.print();
        }, 250);

        setExportOpen(false);
    }

    const totals = useMemo(() => rows.reduce((acc, row) => ({
        all: acc.all + Number(row.all_income_cents || 0),
        paid: acc.paid + Number(row.paid_income_cents || 0),
    }), { all: 0, paid: 0 }), [rows]);

    const calendarYears = presets.filter((item) => /^\d{4}$/.test(item.label));
    const quarters = presets.filter((item) => /^Q[1-4]/.test(item.label));
    const months = presets.filter((item) => !/^\d{4}$/.test(item.label) && !/^Q[1-4]/.test(item.label));

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Income by Customer</h1>
                        <p className="mt-1 text-sm text-slate-500">Report income totals and paid income by member.</p>
                    </div>
                    <div ref={exportMenuRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setExportOpen((current) => !current)}
                            disabled={rows.length === 0}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                            aria-haspopup="menu"
                            aria-expanded={exportOpen}
                        >
                            <span>Export</span>
                            <span aria-hidden="true">⌄</span>
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white py-2 shadow-xl" role="menu">
                                <button type="button" onClick={() => { exportCsv(); setExportOpen(false); }} className="block w-full px-4 py-2 text-left hover:bg-slate-50" role="menuitem">CSV</button>
                                <button type="button" onClick={exportPdf} className="block w-full px-4 py-2 text-left hover:bg-slate-50" role="menuitem">PDF</button>
                            </div>
                        )}
                    </div>
                </div>

                <section className="mb-8 rounded-2xl bg-slate-200/70 p-5">
                    <div className="grid gap-3 lg:grid-cols-[280px_1fr_1fr_auto] lg:items-end">
                        <label className="grid gap-2">
                            <span className="font-semibold">Date Range</span>
                            <select value={rangeValue} onChange={(e) => applyPreset(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-4 py-3">
                                <option value="custom">Custom</option>
                                <optgroup label="Calendar Year">
                                    {calendarYears.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
                                </optgroup>
                                <optgroup label="Calendar Quarter">
                                    {quarters.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
                                </optgroup>
                                <optgroup label="Month">
                                    {months.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
                                </optgroup>
                            </select>
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold">From</span>
                            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setRangeValue("custom"); }} className="rounded-xl border border-blue-300 bg-white px-4 py-3" />
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold">To</span>
                            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setRangeValue("custom"); }} className="rounded-xl border border-blue-300 bg-white px-4 py-3" />
                        </label>

                        <button type="button" onClick={() => loadReport()} className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Update Report</button>
                    </div>
                </section>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-left">
                                    <th className="px-5 py-4 text-sm font-bold uppercase">Customers</th>
                                    <th className="px-5 py-4 text-right text-sm font-bold uppercase">All Income</th>
                                    <th className="px-5 py-4 text-right text-sm font-bold uppercase">Paid Income</th>
                                </tr>
                                <tr className="bg-slate-200/80 text-left">
                                    <th className="px-5 py-3 font-semibold">Income</th>
                                    <th />
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-500">Loading report...</td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400">No invoice income found for this date range.</td></tr>
                                ) : rows.map((row) => (
                                    <tr key={row.member_id} className="border-b border-slate-100">
                                        <td className="px-5 py-4">{row.customer_name}</td>
                                        <td className="px-5 py-4 text-right font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/admin/reports/account-transactions?memberId=${row.member_id}&type=accrual&from=${fromDate}&to=${toDate}`)}
                                                className="font-semibold text-blue-700 hover:underline"
                                            >
                                                {money(row.all_income_cents)}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-right font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/admin/reports/account-transactions?memberId=${row.member_id}&type=cash&from=${fromDate}&to=${toDate}`)}
                                                className="font-semibold text-blue-700 hover:underline"
                                            >
                                                {money(row.paid_income_cents)}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold">
                                    <td className="px-5 py-4">Total Income</td>
                                    <td className="border-t-2 border-slate-900 px-5 py-4 text-right">{money(totals.all)}</td>
                                    <td className="border-t-2 border-slate-900 px-5 py-4 text-right">{money(totals.paid)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
