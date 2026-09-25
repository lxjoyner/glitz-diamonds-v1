"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillInput = {
    vendorName: string;
    billDate: string;
    dueDate: string;
    amount: string;
    amountPaid: string;
    status: "paid" | "unpaid" | "partially_paid";
    billNumber: string;
    notes: string;
};
type EditableBill = BillInput & { key: number };
type PreviewRow = {
    row: number; vendorName: string; billDate: string; dueDate: string;
    totalCents: number; paidCents: number; status: string; billNumber: string;
    vendorAction: string; matchedVendorId: number | null;
    duplicate: boolean; duplicateBillId: number | null; issue: string | null;
};
type PreviewResult = {
    rows: PreviewRow[];
    vendors: Array<{ name: string; action: string; existingId: number | null }>;
    readyCount: number; paidCents: number; totalCents: number;
};
const screenshotData: Array<[string, string, string, string]> = [["Office 365","2026-08-13","2026-08-13","14.21"],["Landing","2026-07-17","2026-07-17","104.70"],["Landing","2026-07-13","2026-07-13","384.80"],["Birthday Money","2026-07-10","2026-07-10","50.00"],["Office 365","2026-07-10","2026-07-10","14.21"],["Reserve Table","2026-07-09","2026-07-09","30.00"],["Office 365","2026-06-12","2026-06-14","14.21"],["Hostinger Web Hosting","2026-06-11","2026-06-11","40.68"],["Hostinger Web Hosting","2026-06-05","2026-06-05","315.33"],["Birthday Money","2026-06-01","2026-06-01","25.00"],["studio 80","2026-05-30","2026-05-30",""],["Office 365","2026-05-12","2026-05-12","14.21"],["Birthday Money","2026-04-18","2026-04-18","25.00"],["Office 365","2026-04-13","2026-04-13","14.21"],["Birthday Money","2026-03-14","2026-03-14","50.00"],["Hearsay restaurant","2026-03-14","2026-03-14","226.67"],["Glitz Shirt","2026-03-13","2026-03-13","50.00"],["Office 365","2026-03-12","2026-03-12","14.21"],["Hobby Lobby","2026-03-05","2026-03-05","20.58"],["Office 365","2026-02-13","2026-02-13","14.21"],["Office 365","2026-01-13","2026-01-13","14.21"],["Social House","2026-01-11","2026-01-11","260.28"],["Office 365","2025-12-13","2025-12-13","13.53"],["Office 365","2025-11-11","2025-11-11","13.53"],["Birthday Money","2025-10-24","2025-10-24","50.00"],["Office 365","2025-10-13","2025-10-13","13.53"],["Office 365","2025-09-14","2025-09-14","13.53"],["Office 365","2025-08-13","2025-08-13","13.53"],["Office 365","2025-07-11","2025-07-13","13.53"],["staples office supply","2025-06-19","2025-06-19","32.46"],["Hostinger Web Hosting","2025-06-11","2025-06-11","336.47"],["Office 365","2025-06-11","2025-06-11","13.53"],["Saltgrass Steakhouse","2025-06-07","2025-06-07","216.92"],["Amazon","2025-06-05","2025-06-05","43.24"],["Birthday Money","2025-06-05","2025-06-05","125.00"],["Office 365","2025-05-11","2025-05-11","13.53"],["Office 365","2025-04-11","2025-04-11","13.53"],["Office 365","2025-03-01","2025-03-01","13.53"],["Office 365","2025-02-11","2025-02-11","13.53"],["Office 365","2025-01-11","2025-01-11","13.53"],["Amazon","2024-12-20","2024-12-20","20.56"],["Amazon","2024-12-20","2024-12-20","30.15"],["Party City","2024-12-20","2024-12-20","11.30"],["Dollar tree","2024-12-14","2024-12-14","35.35"],["Amazon","2024-12-13","2024-12-13","59.51"],["Amazon","2024-12-09","2024-12-09","24.89"],["Birthday Money","2024-12-05","2024-12-05","25.00"],["Birthday Money","2024-11-23","2024-11-23","75.00"],["The Mill","2024-11-23","2024-11-23","315.52"],["The Mill","2024-11-09","2024-11-09","265.07"],["Amazon","2024-07-22","2024-07-22","178.67"],["Birthday Money","2024-07-21","2024-07-21","57.00"],["Nothing Bundt Cakes","2024-07-20","2024-07-20","40.00"],["Birthday Money","2024-06-20","2024-06-20","75.00"],["Godaddy","2024-01-06","2024-01-06","12.17"],["Party City","2023-12-12","2023-12-12","36.81"],["Five Below","2023-12-12","2023-12-12","52.99"],["Florist","2023-09-06","2023-09-06","188.59"],["Social House","2023-07-29","2023-07-29","241.30"],["Shirt maker","2023-07-27","2023-07-27","180.00"],["Hobby Lobby","2023-07-18","2023-07-18","64.97"],["Dollar tree","2023-07-09","2023-07-09","9.47"],["Dollar tree","2023-07-03","2023-07-03","101.61"],["Liquor store","2023-07-01","2023-07-01","62.33"],["Amazon","2023-06-23","2023-06-23","101.59"],["BJs Resturant","2023-06-17","2023-06-17","233.52"],["Seven Kitchen","2023-05-07","2023-05-07","280.00"],["Seven Kitchen","2023-05-01","2023-05-01","386.28"],["EECU","2023-02-28","2023-02-28","5.00"]];
const initialBills: EditableBill[] = screenshotData.map(([vendorName, billDate, dueDate, amount], key) => ({
    key: key + 1, vendorName, billDate, dueDate, amount, amountPaid: "",
    status: "paid", billNumber: "",
    notes: vendorName === "studio 80" ? "Screenshot lists Paid, but total is $0.00. Verify original before import." : "",
}));
const money = (cents: number) => new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
}).format(cents / 100);
function emptyBill(key: number): EditableBill {
    return {
        key, vendorName: "", billDate: "", dueDate: "", amount: "",
        amountPaid: "", status: "paid", billNumber: "", notes: "",
    };
}

export default function HistoricalBillsImportPage() {
    const router = useRouter();
    const [rows, setRows] = useState<EditableBill[]>(initialBills);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [authorized, setAuthorized] = useState(false);
    const [paste, setPaste] = useState("");
    const [result, setResult] = useState<{ importedCount: number; newVendors: number } | null>(null);

    useEffect(() => {
        async function checkAccess() {
            try {
                const response = await fetch("/api/admin/me", { cache: "no-store" });
                const data = await response.json();
                if (!data?.authenticated) return router.push("/admin/login");
                if (data.user?.role !== "admin") return setError("Only administrators can import historical bills.");
                setAuthorized(true);
            } catch {
                setError("Unable to verify admin access.");
            }
        }
        checkAccess();
    }, [router]);

    const uniqueVendorCount = useMemo(() => new Set(rows
        .map((r) => r.vendorName.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, ""))
        .filter(Boolean)).size, [rows]);

    function modify(key: number, field: keyof BillInput, value: string) {
        setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
        setPreview(null);
        setResult(null);
    }
    function addRow() {
        setRows((current) => [...current, emptyBill(Math.max(0, ...current.map((row) => row.key)) + 1)]);
        setPreview(null);
    }
    function removeRow(key: number) {
        setRows((current) => current.filter((row) => row.key !== key));
        setPreview(null);
    }
    function addPastedRows() {
        const next: BillInput[] = paste.trim().split(/\r?\n/).filter(Boolean).map((line) => {
            const parts = line.split("\t");
            return {
                vendorName: (parts[0] || "").trim(),
                billDate: (parts[1] || "").trim(),
                dueDate: (parts[2] || parts[1] || "").trim(),
                amount: (parts[3] || "").trim(),
                amountPaid: (parts[5] || "").trim(),
                status: (["paid", "unpaid", "partially_paid"].includes((parts[4] || "").trim().toLowerCase())
                    ? parts[4].trim().toLowerCase() : "paid") as BillInput["status"],
                billNumber: (parts[6] || "").trim(),
                notes: (parts[7] || "").trim(),
            };
        }).filter((row) => row.vendorName || row.billDate || row.amount);
        if (rows.length + next.length > 250) {
            setError("The importer supports up to 250 bills at a time.");
            return;
        }
        const start = Math.max(0, ...rows.map((row) => row.key)) + 1;
        setRows((current) => [...current, ...next.map((row, i) => ({ ...row, key: start + i }))]);
        setPreview(null);
        setPaste("");
        setError("");
    }
    function payload() {
        return rows.map(({ key: _key, ...row }) => row);
    }

    async function previewBills() {
        setBusy(true); setError(""); setMessage(""); setPreview(null);
        try {
            if (rows.length === 0) throw new Error("Add at least one bill.");
            const response = await fetch("/api/admin/vendor-bills/historical-import", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "preview", bills: payload() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to preview bills.");
            setPreview(data as PreviewResult);
            setMessage("Review the vendors and every bill before importing. Nothing has been saved yet.");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to preview bills.");
        } finally { setBusy(false); }
    }

    async function importBills() {
        if (!preview || preview.rows.some((row) => row.issue)) return;
        if (!window.confirm("Create or reuse the previewed vendors and import these historical bills? This will change your accounting records.")) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const response = await fetch("/api/admin/vendor-bills/historical-import", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "import", bills: payload() }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Import failed.");
            setResult({ importedCount: data.imported.length, newVendors: data.newVendors });
            setPreview(null);
            setMessage("Import complete. Check your Vendors, Bills and Transactions pages.");
        } catch (e) {
            setPreview(null);
            setError(e instanceof Error ? e.message : "Import failed. Preview again.");
        } finally { setBusy(false); }
    }

    const cell = "w-full min-w-24 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";
    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold">Historical Bills Import</h1>
                        <p className="mt-1 text-slate-600">Preview, deduplicate vendors, validate bills, then explicitly import.</p>
                    </div>
                    <Link href="/admin/vendors/bills" className="rounded-full border border-blue-600 bg-white px-5 py-2 font-semibold text-blue-700">Back to Bills</Link>
                </div>

                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <strong>The six supplied screenshots cover the listed pages, with two rows still not fully visible.</strong> The Bills list shows 71 records, but only 69 complete rows are visible across all six
                    supplied screenshots. I prefilled those 69 below, including one <strong>studio 80</strong> row
                    with an unknown positive amount: its screenshot says Paid but Total $0.00. Correct
                    that row or remove it before importing. Two remaining source records are still not fully
                    visible; verify and add them before treating this as a complete 71-bill import.
                    <p className="mt-2">The original screenshots do not show bill numbers, actual payment
                    dates, payment methods or bank accounts. Those details are not invented or booked as
                    new dated payments.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-white p-4"><div className="text-sm text-slate-500">Editable bill rows</div><div className="text-2xl font-bold">{rows.length}</div></div>
                    <div className="rounded-xl border bg-white p-4"><div className="text-sm text-slate-500">Unique vendor names in this batch</div><div className="text-2xl font-bold">{uniqueVendorCount}</div></div>
                    <div className="rounded-xl border bg-white p-4"><div className="text-sm text-slate-500">Ready to import</div><div className="text-2xl font-bold">{preview?.readyCount ?? "Preview first"}</div></div>
                </div>

                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
                {message && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">{message}</div>}
                {result && <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-900">Imported {result.importedCount} bills and created {result.newVendors} vendors.</div>}

                <section className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold">Source rows — correct any uncertain values</h2>
                        <button type="button" disabled={!authorized || rows.length >= 250} onClick={addRow} className="rounded-full border border-blue-600 px-4 py-2 text-blue-700 disabled:opacity-40">+ Add bill row</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] text-left text-sm">
                            <thead><tr className="border-b bg-slate-100">
                                <th className="p-2">#</th><th className="p-2">Vendor</th><th className="p-2">Bill date</th>
                                <th className="p-2">Due date</th><th className="p-2">Total USD</th>
                                <th className="p-2">Status</th><th className="p-2">Paid USD</th>
                                <th className="p-2">Bill number (if known)</th><th className="p-2">Notes</th><th className="p-2"></th>
                            </tr></thead>
                            <tbody>{rows.map((row, index) => (
                                <tr key={row.key} className="border-b align-top">
                                    <td className="p-2">{index + 1}</td>
                                    <td className="p-2"><input aria-label={`Vendor row ${index + 1}`} value={row.vendorName} onChange={(e) => modify(row.key, "vendorName", e.target.value)} className={cell + " min-w-40"} /></td>
                                    <td className="p-2"><input type="date" aria-label={`Bill date row ${index + 1}`} value={row.billDate} onChange={(e) => modify(row.key, "billDate", e.target.value)} className={cell + " min-w-36"} /></td>
                                    <td className="p-2"><input type="date" aria-label={`Due date row ${index + 1}`} value={row.dueDate} onChange={(e) => modify(row.key, "dueDate", e.target.value)} className={cell + " min-w-36"} /></td>
                                    <td className="p-2"><input type="number" min="0" step="0.01" placeholder="Verify" aria-label={`Total row ${index + 1}`} value={row.amount} onChange={(e) => modify(row.key, "amount", e.target.value)} className={cell + " min-w-24"} /></td>
                                    <td className="p-2"><select value={row.status} onChange={(e) => modify(row.key, "status", e.target.value)} className={cell}>
                                        <option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="partially_paid">Partially paid</option>
                                    </select></td>
                                    <td className="p-2"><input type="number" min="0" step="0.01" placeholder={row.status === "paid" ? "Full total" : "0.00"} aria-label={`Paid amount row ${index + 1}`} value={row.amountPaid} onChange={(e) => modify(row.key, "amountPaid", e.target.value)} className={cell} /></td>
                                    <td className="p-2"><input value={row.billNumber} placeholder="Not provided" onChange={(e) => modify(row.key, "billNumber", e.target.value)} className={cell + " min-w-32"} /></td>
                                    <td className="p-2"><input value={row.notes} placeholder="Optional notes" onChange={(e) => modify(row.key, "notes", e.target.value)} className={cell + " min-w-48"} /></td>
                                    <td className="p-2"><button type="button" onClick={() => removeRow(row.key)} aria-label={`Remove row ${index + 1}`} className="rounded border border-red-300 px-3 py-2 text-red-700">Remove</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-2xl border bg-white p-5">
                    <h2 className="text-lg font-semibold">Add more bills from the remaining screenshots</h2>
                    <p className="mt-1 text-sm text-slate-600">Optional: paste tab-separated rows copied from a spreadsheet.
                        Columns: vendor, bill date, due date, total, status, paid amount, bill number, notes.
                        Dates should be YYYY-MM-DD. You can also use Add bill row.</p>
                    <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder={"Office 365\t2025-11-13\t2025-11-13\t13.53\tpaid"} className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" />
                    <button type="button" disabled={!paste.trim() || !authorized} onClick={addPastedRows} className="mt-2 rounded-full border border-blue-600 px-5 py-2 font-semibold text-blue-700 disabled:opacity-40">Add pasted rows</button>
                </section>

                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={!authorized || busy || rows.length === 0} onClick={previewBills} className="rounded-full bg-blue-700 px-7 py-3 font-bold text-white disabled:opacity-40">{busy ? "Working..." : "Preview import"}</button>
                    {preview && <button type="button" disabled={!authorized || busy || preview.rows.some((row) => Boolean(row.issue))} onClick={importBills} className="rounded-full bg-emerald-700 px-7 py-3 font-bold text-white disabled:opacity-40">Confirm and Import {preview.readyCount} bills</button>}
                </div>

                {preview && (
                    <section className="space-y-5 rounded-2xl border border-blue-300 bg-white p-5">
                        <div>
                            <h2 className="text-xl font-bold">Preview — nothing saved yet</h2>
                            <p className="text-sm text-slate-600">{preview.readyCount} ready · Total {money(preview.totalCents)} · Historical paid {money(preview.paidCents)} · {preview.rows.length - preview.readyCount} requiring review</p>
                        </div>
                        <div><h3 className="mb-2 font-semibold">Unique vendors</h3>
                            <div className="flex flex-wrap gap-2">{preview.vendors.map((vendor) => (
                                <span key={vendor.name.toLowerCase()} className={`rounded-lg px-3 py-2 text-sm ${vendor.action === "create" ? "bg-blue-50 text-blue-900" : vendor.action === "reuse" ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
                                    {vendor.name} — {vendor.action === "reuse" ? "reuse existing" : vendor.action === "create" ? "create vendor" : "resolve matching vendors"}
                                </span>
                            ))}</div>
                        </div>
                        <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm">
                            <thead><tr className="border-b bg-slate-100"><th className="p-3">Row</th><th className="p-3">Vendor</th><th className="p-3">Bill date / due</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Paid</th><th className="p-3">Review</th></tr></thead>
                            <tbody>{preview.rows.map((item) => <tr key={item.row} className="border-b">
                                <td className="p-3">{item.row}</td><td className="p-3">{item.vendorName}</td><td className="p-3">{item.billDate} / {item.dueDate}</td>
                                <td className="p-3 text-right">{money(item.totalCents)}</td><td className="p-3 text-right">{money(item.paidCents)}</td>
                                <td className={`p-3 ${item.issue ? "font-semibold text-red-700" : "text-green-700"}`}>{item.issue || "Ready"}</td>
                            </tr>)}</tbody>
                        </table></div>
                        {preview.rows.some((row) => row.issue) && <p className="rounded-lg bg-amber-50 p-3 font-semibold text-amber-900">Resolve every highlighted row or remove the unconfirmed row, then run Preview again to enable Import.</p>}
                    </section>
                )}
            </div>
        </main>
    );
}
