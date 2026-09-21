"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Vendor = {
    id: number;
    vendor_name: string;
    currency: string;
};

type Line = {
    id: number;
    item: string;
    expenseCategory: string;
    description: string;
    quantity: string;
    price: string;
    tax: string;
};

function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    const ref = useRef<HTMLInputElement | null>(null);
    return (
        <label className="grid gap-2">
            <span className="font-semibold text-slate-600">{label}</span>
            <div className="relative">
                <input ref={ref} type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 pr-14 [&::-webkit-calendar-picker-indicator]:opacity-0" />
                <button type="button" aria-label={`Open ${label} date picker`} onClick={() => ref.current?.showPicker()} className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200 active:bg-blue-300">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                    </svg>
                </button>
            </div>
        </label>
    );
}

export default function VendorCreateBillPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const vendorId = Number(params.id);

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState(vendorId);
    const [currency, setCurrency] = useState("USD");
    const [billDate, setBillDate] = useState(todayLocal());
    const [dueDate, setDueDate] = useState(todayLocal());
    const [purchaseOrder, setPurchaseOrder] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<Line[]>([{ id: 1, item: "", expenseCategory: "", description: "", quantity: "1", price: "0", tax: "0" }]);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function init() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) {
                setMessage("Only admins and treasurers can create bills.");
                return;
            }

            const vendorsRes = await fetch("/api/admin/vendors", { cache: "no-store" });
            const vendorsData = await vendorsRes.json();
            if (!vendorsRes.ok) {
                setMessage(vendorsData?.error || "Failed to load vendors.");
                return;
            }
            const loaded = vendorsData.vendors || [];
            setVendors(loaded);
            const selected = loaded.find((vendor: Vendor) => vendor.id === vendorId);
            if (selected) {
                setSelectedVendorId(selected.id);
                setCurrency(selected.currency || "USD");
            }
        }
        init();
    }, [router, vendorId]);

    const totals = useMemo(() => {
        const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.price) || 0), 0);
        const totalTax = lines.reduce((sum, line) => sum + (Number(line.tax) || 0), 0);
        const total = subtotal + totalTax;
        return { subtotal, totalTax, total };
    }, [lines]);

    function updateLine(id: number, key: keyof Line, value: string) {
        setLines((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));
    }

    function addLine() {
        setLines((current) => [...current, { id: Date.now(), item: "", expenseCategory: "", description: "", quantity: "1", price: "0", tax: "0" }]);
    }

    function removeLine(id: number) {
        setLines((current) => current.length === 1 ? current : current.filter((line) => line.id !== id));
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/vendor-bills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendorId: selectedVendorId,
                    billDate,
                    dueDate,
                    purchaseOrder,
                    billNumber,
                    notes,
                    currency,
                    lines,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save bill.");
            router.push("/admin/vendors");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to save bill.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <h1 className="mb-8 text-4xl font-bold tracking-tight">Add bill</h1>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <form onSubmit={submit}>
                    <section className="mb-6 grid gap-6 rounded-2xl bg-white p-6 shadow-sm lg:grid-cols-3">
                        <div className="space-y-5">
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">Vendor <span className="text-red-600">*</span></span>
                                <select value={selectedVendorId} onChange={(e) => {
                                    const nextId = Number(e.target.value);
                                    setSelectedVendorId(nextId);
                                    const selected = vendors.find((vendor) => vendor.id === nextId);
                                    if (selected) setCurrency(selected.currency || "USD");
                                }} className="rounded-xl border border-blue-300 bg-white px-4 py-3">
                                    {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">Currency</span>
                                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-4 py-3">
                                    <option value="USD">USD - U.S. dollar</option>
                                </select>
                            </label>
                        </div>

                        <div className="space-y-5">
                            <DateField label="Bill Date" value={billDate} onChange={setBillDate} />
                            <DateField label="Due Date" value={dueDate} onChange={setDueDate} />
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">P.O./S.O.</span>
                                <input value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
                            </label>
                        </div>

                        <div className="space-y-5">
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">Bill #</span>
                                <input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="rounded-xl border border-blue-300 bg-white px-4 py-3" />
                            </label>
                            <label className="grid gap-2">
                                <span className="font-semibold text-slate-600">Notes</span>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
                            </label>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left">
                                        <th className="px-3 py-3">Item</th>
                                        <th className="px-3 py-3">Expense Category</th>
                                        <th className="px-3 py-3">Description</th>
                                        <th className="px-3 py-3">Qty</th>
                                        <th className="px-3 py-3">Price</th>
                                        <th className="px-3 py-3">Tax</th>
                                        <th className="px-3 py-3 text-right">Amount</th>
                                        <th className="px-3 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line) => {
                                        const amount = (Number(line.quantity) || 0) * (Number(line.price) || 0) + (Number(line.tax) || 0);
                                        return (
                                            <tr key={line.id} className="border-b border-slate-100">
                                                <td className="px-3 py-3"><input value={line.item} onChange={(e) => updateLine(line.id, "item", e.target.value)} placeholder="Choose" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                                                <td className="px-3 py-3"><input value={line.expenseCategory} onChange={(e) => updateLine(line.id, "expenseCategory", e.target.value)} placeholder="Choose" className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                                                <td className="px-3 py-3"><input value={line.description} onChange={(e) => updateLine(line.id, "description", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></td>
                                                <td className="px-3 py-3"><input type="number" min="0" step="0.01" value={line.quantity} onChange={(e) => updateLine(line.id, "quantity", e.target.value)} className="w-24 rounded-lg border border-slate-300 px-3 py-2" /></td>
                                                <td className="px-3 py-3"><input type="number" min="0" step="0.01" value={line.price} onChange={(e) => updateLine(line.id, "price", e.target.value)} className="w-28 rounded-lg border border-slate-300 px-3 py-2" /></td>
                                                <td className="px-3 py-3"><input type="number" min="0" step="0.01" value={line.tax} onChange={(e) => updateLine(line.id, "tax", e.target.value)} className="w-28 rounded-lg border border-slate-300 px-3 py-2" /></td>
                                                <td className="px-3 py-3 text-right font-medium">{money(amount)}</td>
                                                <td className="px-3 py-3 text-right"><button type="button" onClick={() => removeLine(line.id)} className="text-blue-700 hover:text-red-600" aria-label="Delete line">🗑</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-start justify-between gap-6 border-t border-slate-200 px-3 py-4">
                            <button type="button" onClick={addLine} className="font-semibold text-blue-700 hover:underline">⊕ Add a line</button>
                            <div className="min-w-[280px] space-y-2 text-sm">
                                <div className="flex justify-between gap-8"><span>Subtotal:</span><span>{money(totals.subtotal)}</span></div>
                                <div className="flex justify-between gap-8"><span>Total tax (USD):</span><span>{money(totals.totalTax)}</span></div>
                                <div className="flex justify-between gap-8"><span>Total Paid (USD):</span><span>{money(0)}</span></div>
                                <div className="flex justify-between gap-8 font-semibold"><span>Amount Due (USD):</span><span>{money(totals.total)}</span></div>
                            </div>
                        </div>
                    </section>

                    <div className="mt-5 flex justify-end gap-3">
                        <button type="button" onClick={() => router.push("/admin/vendors")} className="rounded-full border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50">Cancel</button>
                        <button disabled={saving} className="rounded-full bg-blue-700 px-8 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                    </div>
                </form>
            </div>
        </main>
    );
}
