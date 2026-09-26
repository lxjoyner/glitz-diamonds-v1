"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getYolandaInvoicePreset, YOLANDA_SOURCE_COUNT, YOLANDA_SOURCE_TOTAL_CENTS } from "@/lib/historical-invoice-presets/yolanda";

type Member = { id: number; full_name: string; email: string };
type Row = {
    oldInvoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    paymentDate?: string;
    amount: string;
    amountPaid: string;
    status: "paid" | "unpaid" | "overdue";
    recurring: boolean;
    description: string;
};

type PreviewRow = Row & { duplicate: boolean; duplicateInvoiceNumber?: string };

const emptyRow = (): Row => ({
    oldInvoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    amount: "25.00",
    amountPaid: "0.00",
    status: "unpaid",
    recurring: true,
    description: "Recurring membership invoice",
});

export default function HistoricalInvoiceImportPage() {
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [memberId, setMemberId] = useState("");
    const [rows, setRows] = useState<Row[]>([emptyRow()]);
    const [preview, setPreview] = useState<PreviewRow[]>([]);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [yolandaPresetLoaded, setYolandaPresetLoaded] = useState(false);
    const [paymentAccount, setPaymentAccount] = useState("");

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (me.user?.role !== "admin") return setMessage("Only admins can import historical invoices.");

            const usersRes = await fetch("/api/admin/users", { cache: "no-store" });
            const users = await usersRes.json();
            if (usersRes.ok) setMembers((users.users || []).filter((user: Member) => user.email));
        }
        load();
    }, [router]);

    const selectedMember = useMemo(() => members.find((member) => String(member.id) === memberId), [members, memberId]);

    function changeInvoiceDate(index: number, date: string) {
        setRows(current => current.map((row, i) => i === index
            ? { ...row, invoiceDate: date, ...(yolandaPresetLoaded ? { dueDate: date, paymentDate: date } : {}) }
            : row));
        setPreview([]);
    }

    function updateRow(index: number, field: keyof Row, value: string | boolean) {
        setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
        setPreview([]);
    }

    function loadYolandaPreset() {
        const hasData = rows.some((row) => row.oldInvoiceNumber || row.invoiceDate);
        if (hasData && !window.confirm("Replace the current draft rows with Yolanda's 47 screenshot invoices? Unsaved edits will be lost.")) return;
        setRows(getYolandaInvoicePreset());
        setYolandaPresetLoaded(true);
        setPreview([]);
        setMessage("Loaded 47 Paid historical invoices totaling $2,225.00. As confirmed, the invoice date, due date and payment date match the date on each source row. Verify the selected member, amounts and payment account before import.");
    }

    function addRows(count = 1) {
        setRows((current) => [...current, ...Array.from({ length: count }, emptyRow)]);
        setPreview([]);
    }

    function removeRow(index: number) {
        setRows((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));
        setPreview([]);
    }

    function parsePaste() {
        const text = window.prompt(
            "Paste rows in this order, one per line:\nOld invoice # | Invoice date | Due date | Amount | Status | Amount paid | Recurring\n\nExample:\n198 | 2024-07-01 | 2024-07-01 | 25.00 | paid | 25.00 | yes"
        );
        if (!text) return;

        const parsed = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
            const parts = line.split(/\t|\|/).map((part) => part.trim());
            const statusText = String(parts[4] || "unpaid").toLowerCase();
            const status: Row["status"] = statusText === "paid" ? "paid" : statusText.includes("over") || statusText.includes("past") ? "overdue" : "unpaid";
            const recurring = !["no", "false", "0"].includes(String(parts[6] || "yes").toLowerCase());
            return {
                oldInvoiceNumber: parts[0] || "",
                invoiceDate: parts[1] || "",
                dueDate: parts[2] || parts[1] || "",
                amount: parts[3] || "25.00",
                amountPaid: parts[5] || (status === "paid" ? parts[3] || "25.00" : "0.00"),
                status,
                recurring,
                description: recurring ? "Recurring membership invoice" : "Historical membership invoice",
            } satisfies Row;
        });
        if (parsed.length) {
            setRows(parsed);
            setYolandaPresetLoaded(false);
        }
        setPreview([]);
    }

    async function submit(mode: "preview" | "import") {
        setMessage("");
        if (!memberId) return setMessage("Select a member first.");
        if (mode === "import" && yolandaPresetLoaded) {
            if (!selectedMember || !selectedMember.full_name.toLowerCase().includes("yolanda")) {
                return setMessage("Confirm the correct Yolanda member record before importing. Do not select another member based only on the uploaded filename.");
            }
            if (!window.confirm(`Import ${rows.length} paid invoice rows into member ${selectedMember.full_name} (${selectedMember.email})? Confirm the member and amounts. Due dates and payment dates match the source row dates per your instructions. No emails will be sent.`)) return;
        }
        setBusy(true);
        try {
            const response = await fetch("/api/admin/invoices/historical-import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    memberId,
                    mode,
                    invoices: rows.map((row) => ({
                        ...row,
                        paymentDate: row.paymentDate || undefined,
                        amount: Number(row.amount),
                        amountPaid: Number(row.amountPaid),
                    })),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Historical invoice import failed.");

            if (mode === "preview") {
                setPreview(data.preview || []);
                const duplicates = (data.preview || []).filter((row: PreviewRow) => row.duplicate).length;
                setMessage(`Preview ready for ${data.member?.full_name || "member"}. ${duplicates} possible duplicate${duplicates === 1 ? "" : "s"} found.`);
            } else {
                setPreview([]);
                setMessage(`Import complete. ${data.importedCount || 0} invoice(s) created; ${data.skippedCount || 0} duplicate(s) skipped.`);
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Historical invoice import failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex min-h-[108px] flex-wrap items-center justify-between gap-5 px-4 py-5 sm:px-6 sm:py-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight leading-tight text-white">Historical invoice import</h1>
                        <p className="mt-1 text-sm text-white">Import prior invoices while preserving the old invoice number as a reference.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={loadYolandaPreset} disabled={busy} className="rounded-full border border-emerald-700 bg-white px-5 py-3 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Load Yolanda ({YOLANDA_SOURCE_COUNT})</button>
                        <button type="button" onClick={parsePaste} className="rounded-full border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50">Paste rows</button>
                        <button type="button" onClick={() => submit("preview")} disabled={busy} className="rounded-full border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Preview</button>
                        <button type="button" onClick={() => submit("import")} disabled={busy || preview.length === 0} className="rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-50">{busy ? "Working..." : "Import invoices"}</button>
                    </div>
                </header>

                <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-700">Member</label>
                    <select value={memberId} onChange={(event) => { setMemberId(event.target.value); setPreview([]); }} className="mt-2 w-full max-w-2xl rounded-xl border border-slate-300 px-4 py-3">
                        <option value="">Select a member</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}
                    </select>
                    {selectedMember && <p className="mt-2 text-sm text-slate-500">Importing into member #{selectedMember.id}: {selectedMember.full_name}</p>}
                    {yolandaPresetLoaded && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <p className="font-semibold">Yolanda screenshot import loaded: {rows.length} editable rows; source total {(YOLANDA_SOURCE_TOTAL_CENTS / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} across {YOLANDA_SOURCE_COUNT} source records.</p>
                        <p className="mt-1">The screenshots identify the customer only as Yolanda; confirm the correct existing member yourself. All 47 rows show Paid with $0.00 remaining. You confirmed the invoice, due and payment dates are identical on every row. Payment account, method and original line-item details were not shown. No emails are sent by the import.</p>
                        <p className="mt-1">Pay particular attention to legacy #27 ($1,000), #77 ($100), and the seven rows without a visible Recurring label.</p>
                    </div>}}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px] border-collapse text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-3">Old #</th><th className="px-3 py-3">Invoice date</th><th className="px-3 py-3">Due date</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Amount paid</th><th className="px-3 py-3">Recurring</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Duplicate?</th><th className="px-3 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => {
                                    const previewRow = preview[index];
                                    return <tr key={index} className="border-t border-slate-200 align-top">
                                        <td className="px-3 py-3"><input value={row.oldInvoiceNumber} onChange={(event) => updateRow(index, "oldInvoiceNumber", event.target.value)} className="w-28 rounded-lg border border-slate-300 px-2 py-2" /></td>
                                        <td className="px-3 py-3"><input type="date" value={row.invoiceDate} onChange={(event) => changeInvoiceDate(index, event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2" /></td>
                                        <td className="px-3 py-3"><input type="date" value={row.dueDate} onChange={(event) => updateRow(index, "dueDate", event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2" /></td>
                                        <td className="px-3 py-3"><input type="number" min="0.01" step="0.01" value={row.amount} onChange={(event) => updateRow(index, "amount", event.target.value)} className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-right" /></td>
                                        <td className="px-3 py-3"><select value={row.status} onChange={(event) => updateRow(index, "status", event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2"><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="unpaid">Unpaid</option></select></td>
                                        <td className="px-3 py-3"><input type="number" min="0" step="0.01" value={row.amountPaid} onChange={(event) => updateRow(index, "amountPaid", event.target.value)} className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-right" /></td>
                                        <td className="px-3 py-3 text-center"><input type="checkbox" checked={row.recurring} onChange={(event) => updateRow(index, "recurring", event.target.checked)} className="h-5 w-5" /></td>
                                        <td className="px-3 py-3"><input value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} className="w-64 rounded-lg border border-slate-300 px-2 py-2" /></td>
                                        <td className="px-3 py-3">{previewRow ? previewRow.duplicate ? <span className="font-semibold text-red-700">Yes{previewRow.duplicateInvoiceNumber ? ` — ${previewRow.duplicateInvoiceNumber}` : ""}</span> : <span className="font-semibold text-emerald-700">No</span> : "—"}</td>
                                        <td className="px-3 py-3"><button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1} className="text-red-700 disabled:opacity-30">Remove</button></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap gap-4 border-t border-slate-200 px-5 py-4">
                        <button type="button" onClick={() => addRows(1)} className="font-semibold text-blue-700">＋ Add row</button>
                        <button type="button" onClick={() => addRows(10)} className="font-semibold text-blue-700">＋ Add 10 rows</button>
                    </div>
                </section>

                {message && <p className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</p>}
                <div className="mt-5 flex gap-4"><Link href="/admin/invoices" className="font-semibold text-blue-700">← Back to invoices</Link><Link href="/admin/invoices/recurring/new" className="font-semibold text-blue-700">Create recurring invoice →</Link></div>
            </div>
        </main>
    );
}
