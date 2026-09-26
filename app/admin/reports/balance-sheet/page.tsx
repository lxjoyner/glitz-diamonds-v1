"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Report = {
    asOf: string; reportType: "accrual" | "cash";
    cashOnHandCents: number; accountsReceivableCents: number; pastDueCents: number;
    currentReceivablesCents: number; netRecordedCashMovementCents: number; hasVerifiedCashBalance: boolean; totalInvoicesDonationsCents: number;
    currentPayablesCents: number; notes: string[];
};
const currency = (cents: number) => new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
}).format(Number(cents || 0) / 100);
type View = "summary" | "details";

export default function BalanceSheetPage() {
    const router = useRouter();
    const now = new Date();
    const [year, setYear] = useState(String(now.getFullYear()));
    const [asOf, setAsOf] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`);
    const [reportType, setReportType] = useState<"accrual" | "cash">("accrual");
    const [view, setView] = useState<View>("summary");
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exportOpen, setExportOpen] = useState(false);
    const [canSetOpening, setCanSetOpening] = useState(false);
    const [openingDate, setOpeningDate] = useState("");
    const [openingAmount, setOpeningAmount] = useState("");
    const [openingSaved, setOpeningSaved] = useState("");
    const [openingBusy, setOpeningBusy] = useState(false);

    async function load(date = asOf, type = reportType) {
        setError(""); setLoading(true);
        try {
            const res = await fetch(`/api/admin/reports/balance-sheet?asOf=${encodeURIComponent(date)}&type=${type}`, { cache: "no-store" });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Report failed.");
            setReport(body.report);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Report failed.");
        } finally { setLoading(false); }
    }
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const response = await fetch("/api/admin/me", { cache: "no-store" });
                const me = await response.json();
                if (!me.authenticated) { router.push("/admin/login"); return; }
                if (!["admin","treasurer"].includes(me.user?.role)) throw new Error("Access denied.");
                setCanSetOpening(me.user.role === "admin");
                const openingResponse = await fetch("/api/admin/reports/balance-sheet/opening", { cache: "no-store" });
                if (openingResponse.ok) {
                    const openingResult = await openingResponse.json();
                    if (openingResult.opening) {
                        setOpeningDate(openingResult.opening.balanceDate);
                        setOpeningAmount((Number(openingResult.opening.openingCents)/100).toFixed(2));
                        setOpeningSaved("Opening balance configured.");
                    }
                }
                if (active) await load();
            } catch (err) { if (active) { setError(err instanceof Error ? err.message : "Access denied."); setLoading(false); } }
        })();
        return () => { active = false; };
    // Initial request only. All later requests use Update Report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    async function saveOpening() {
        setError("");setOpeningSaved("");setOpeningBusy(true);
        const amount = Number(openingAmount);
        if (!openingDate || !Number.isFinite(amount) || amount < 0 ||
            !/^\d+(?:\.\d{1,2})?$/.test(openingAmount.trim())) {
            setError("Enter a verified date and valid nonnegative cash/bank amount.");
            setOpeningBusy(false);return;
        }
        try {
            const response = await fetch("/api/admin/reports/balance-sheet/opening", {
                method:"PUT",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({balanceDate:openingDate,openingCents:Math.round(amount*100)})
            });
            const result = await response.json();
            if(!response.ok) throw new Error(result.error || "Unable to save opening balance.");
            setOpeningSaved("Opening balance saved. Report recalculated.");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to save opening balance.");
        } finally {setOpeningBusy(false);}
    }

    function exportReport(format: "csv" | "pdf") {
        if (!report) return;
        setExportOpen(false);
        const query = new URLSearchParams({ asOf: report.asOf, type: report.reportType, view, format });
        window.location.assign(`/api/admin/reports/balance-sheet/export?${query.toString()}`);
    }
    const titleDate = report ? new Date(report.asOf + "T12:00:00").toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    }) : "";
    const section = (label: string) => <tr className="bg-slate-200"><th colSpan={2} className="px-5 py-3 text-left text-base">{label}</th></tr>;
    const subsection = (label: string) => <tr className="bg-slate-50"><th colSpan={2} className="px-8 py-3 text-left">{label}</th></tr>;
    const line = (label: string, amount: number | null, level = 1, bold = false, help?: string) =>
        <tr key={label} className="border-b border-slate-200">
            <td className={`py-3 pr-4 ${level === 2 ? "pl-12" : "pl-7"} ${bold ? "font-bold" : ""}`} title={help}>{label}</td>
            <td className={`py-3 pr-5 text-right ${bold ? "font-bold" : ""}`}>{amount === null ? "N/A*" : currency(amount)}</td>
        </tr>;
    return <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8">
        <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-4xl font-bold">Balance Sheet</h1>
                <div className="relative">
                    <button type="button" onClick={() => setExportOpen(!exportOpen)}
                        disabled={!report || loading}
                        className="rounded-full border border-blue-600 bg-white px-6 py-2.5 font-semibold text-blue-700 disabled:opacity-40"
                        aria-haspopup="menu" aria-expanded={exportOpen}>Export ▾</button>
                    {exportOpen && <div role="menu" className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                        <button role="menuitem" type="button" onClick={() => exportReport("csv")} className="block w-full px-4 py-2 text-left hover:bg-blue-50">CSV</button>
                        <button role="menuitem" type="button" onClick={() => exportReport("pdf")} className="block w-full px-4 py-2 text-left hover:bg-blue-50">PDF</button>
                    </div>}
                </div>
            </div>
            <div className="mb-9 flex flex-wrap items-end gap-5 rounded-xl bg-slate-100 px-5 py-6">
                <label className="grid gap-2 font-medium">As of year
                    <select value={year} onChange={event => {
                        const y = event.target.value; setYear(y); setAsOf(`${y}${asOf.slice(4)}`);
                    }} className="min-w-40 rounded-xl border border-blue-200 bg-white px-4 py-3">
                        {Array.from({length: 8}, (_, i) => String(now.getFullYear()-i)).map(y=><option key={y}>{y}</option>)}
                    </select>
                </label>
                <label className="grid gap-2 font-medium">As of date
                    <input type="date" value={asOf} onChange={e => {
                        setAsOf(e.target.value);
                        if (e.target.value) setYear(e.target.value.slice(0,4));
                    }} className="rounded-xl border border-blue-200 bg-white px-4 py-3" />
                </label>
                <label className="grid gap-2 font-medium">Report Type
                    <select value={reportType} onChange={e=>setReportType(e.target.value as "accrual"|"cash")} className="rounded-xl border border-blue-200 bg-white px-4 py-3">
                        <option value="accrual">Accrual (Paid &amp; Unpaid)</option>
                        <option value="cash">Cash Basis (Recorded Payments)</option>
                    </select>
                </label>
                <button type="button" onClick={() => load()} disabled={loading || !asOf}
                    className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">{loading?"Loading...":"Update Report"}</button>
            </div>
            {canSetOpening && <details className="mb-5 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <summary className="cursor-pointer font-semibold text-blue-800">Configure opening Cash and Bank balance</summary>
                <p className="mt-3 text-sm text-slate-600">Enter the independently verified closing balance for all cash/bank accounts on a known date. Later recorded in-app receipts and vendor payments are applied after that date. Do not enter the sample amounts unless they match your own accounts.</p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="grid gap-1 text-sm font-medium">Verified balance date
                        <input type="date" value={openingDate} onChange={e=>setOpeningDate(e.target.value)} className="rounded-lg border px-3 py-2" />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">Combined Cash and Bank ($)
                        <input type="text" inputMode="decimal" placeholder="0.00" value={openingAmount} onChange={e=>setOpeningAmount(e.target.value)} className="rounded-lg border px-3 py-2" />
                    </label>
                    <button type="button" disabled={openingBusy} onClick={saveOpening} className="rounded-full bg-blue-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{openingBusy?"Saving...":"Save opening balance"}</button>
                </div>
                {openingSaved && <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{openingSaved}</p>}
            </details>}
            {error && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}
            {report && <>
                <div className="mb-8 flex flex-wrap items-center justify-center gap-4 text-center">
                    <div><p className="text-sm font-semibold text-slate-600">Cash and Bank*</p><p className="mt-2 text-3xl">{report.hasVerifiedCashBalance ? currency(report.cashOnHandCents) : "N/A*"}</p></div>
                    <span className="text-3xl text-slate-300">+</span>
                    <div><p className="text-sm font-semibold text-slate-600">To be received</p><p className="mt-2 text-3xl">{currency(report.accountsReceivableCents)}</p></div>
                    <span className="text-3xl text-slate-300">=</span>
                    <div><p className="text-sm font-semibold text-slate-600">Total Invoices and Donations</p><p className="mt-2 text-3xl font-bold text-green-700">{report.hasVerifiedCashBalance ? currency(report.totalInvoicesDonationsCents) : "N/A*"}</p></div>
                </div>
                <div className="mb-7 flex justify-center border-b border-slate-200 pb-3">
                    <div className="inline-flex rounded-2xl bg-blue-50 p-1">
                        <button type="button" onClick={() => setView("summary")} className={`rounded-xl px-6 py-2 ${view === "summary"?"bg-white font-bold shadow":"font-medium"}`}>Summary</button>
                        <button type="button" onClick={() => setView("details")} className={`rounded-xl px-6 py-2 ${view === "details"?"bg-white font-bold shadow":"font-medium"}`}>Details</button>
                    </div>
                </div>
                <div className="mb-4 flex justify-between px-3 text-sm font-bold"><span>ACCOUNTS</span><span>{titleDate}</span></div>
                <table className="w-full border-collapse bg-white text-base"><tbody>
                    {section("Invoices & Donations")}
                    {view==="details" && subsection("Cash and Bank")}
                    {line(view==="details"?"Cash on Hand*":"Total Cash and Bank*",report.hasVerifiedCashBalance ? report.cashOnHandCents : null,view==="details"?2:1,view==="summary")}
                    {view==="details" && line("Total Cash and Bank*",report.hasVerifiedCashBalance ? report.cashOnHandCents : null,1,true)}
                    {view==="details" ? <>
                        {subsection("Other Invoices & Donations")}
                        {line("Accounts Receivable",report.accountsReceivableCents,2)}
                        {line("Past Due Payments (included in receivables)",report.pastDueCents,2,false,"Informational breakdown; not added a second time.")}
                        {line("Total Current Invoices & Donations",report.accountsReceivableCents,1,true)}
                    </> : <>
                        {line("Total Past Due Payments (part of receivables)",report.pastDueCents)}
                        {line("Total Other Current Invoices & Donations",report.accountsReceivableCents)}
                    </>}
                    {line("Total Invoices and Donations",report.hasVerifiedCashBalance ? report.totalInvoicesDonationsCents : null,1,true)}
                </tbody></table>
                <p className="mt-5 text-sm text-slate-700">Net recorded cash movement (not an account balance): <strong>{currency(report.netRecordedCashMovementCents)}</strong></p>
                <aside className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                    <p className="mb-2 font-bold">Report data notes</p>
                    {report.notes.map(note=><p className="mb-1" key={note}>{note}</p>)}
                </aside>
            </>}
        </div>
    </main>;
}
