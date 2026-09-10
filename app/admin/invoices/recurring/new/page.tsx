"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
    id: number;
    full_name: string;
    email: string;
    address?: string;
};

type LineItem = { description: string; quantity: number; unitPrice: number };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function NewRecurringInvoicePage() {
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [memberId, setMemberId] = useState("");
    const [showCustomerPicker, setShowCustomerPicker] = useState(false);
    const [referenceNumber, setReferenceNumber] = useState("");
    const [paymentDue, setPaymentDue] = useState("on_receipt");
    const [status, setStatus] = useState<"active" | "draft">("active");
    const [repeatDay, setRepeatDay] = useState(1);
    const [firstInvoiceDate, setFirstInvoiceDate] = useState(today());
    const [nextInvoiceDate, setNextInvoiceDate] = useState(today());
    const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 25 }]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) return setMessage("Only admins and treasurers can create recurring invoices.");
            const usersRes = await fetch("/api/admin/users", { cache: "no-store" });
            const users = await usersRes.json();
            if (usersRes.ok) setMembers((users.users || []).filter((user: Member) => user.email));
        }
        load();
    }, [router]);

    const selectedMember = members.find((member) => String(member.id) === memberId);
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0), [items]);
    const total = subtotal;

    function updateItem(index: number, field: keyof LineItem, value: string) {
        setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: field === "description" ? value : Number(value) } : item));
    }

    async function save() {
        setMessage("");
        if (!memberId) return setMessage("Select a member before saving the recurring invoice.");
        if (items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) return setMessage("Complete all invoice line items before saving.");
        setSaving(true);
        try {
            const res = await fetch("/api/admin/recurring-invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    memberId,
                    status,
                    repeatDay,
                    firstInvoiceDate,
                    nextInvoiceDate,
                    amount: total,
                    notes,
                    referenceNumber,
                    paymentDue,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to create recurring invoice.");
            router.push("/admin/invoices/recurring");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to create recurring invoice.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex min-h-[53px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
                    <h1 className="text-4xl font-bold tracking-tight text-white">New recurring invoice</h1>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => window.print()} className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Preview</button>
                        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-black px-6 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
                    </div>
                </header>

                <details className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <summary className="cursor-pointer font-semibold">Business address and contact details, title, summary, and logo</summary>
                </details>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
                        <div>
                            {!selectedMember ? (
                                <div className="max-w-sm">
                                    <button type="button" onClick={() => setShowCustomerPicker((current) => !current)} className="flex min-h-32 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white font-semibold text-blue-700 hover:bg-blue-50">
                                        <span className="text-2xl" aria-hidden="true">♙</span>
                                        <span>＋ Add a customer</span>
                                    </button>
                                    {showCustomerPicker ? (
                                        <select
                                            autoFocus
                                            value={memberId}
                                            onChange={(event) => {
                                                setMemberId(event.target.value);
                                                if (event.target.value) setShowCustomerPicker(false);
                                            }}
                                            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3"
                                        >
                                            <option value="">Select a current member</option>
                                            {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}
                                        </select>
                                    ) : null}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs font-semibold">Bill to</p>
                                    <p className="mt-1 font-semibold">{selectedMember.full_name}</p>
                                    {selectedMember.address ? <p className="mt-1 whitespace-pre-line text-sm">{selectedMember.address}</p> : null}
                                    <p className="mt-4 text-sm">{selectedMember.email}</p>
                                    <button type="button" onClick={() => setShowCustomerPicker(true)} className="mt-2 text-sm font-semibold text-blue-700 hover:underline">Choose a different customer</button>
                                    {showCustomerPicker ? (
                                        <select
                                            value={memberId}
                                            onChange={(event) => {
                                                setMemberId(event.target.value);
                                                if (event.target.value) setShowCustomerPicker(false);
                                            }}
                                            className="mt-3 w-full max-w-md rounded-xl border border-slate-300 px-4 py-3"
                                        >
                                            <option value="">Select a current member</option>
                                            {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}
                                        </select>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Invoice number</span><input value="Auto-generated" disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">P.O./S.O. number</span><input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Invoice date</span><input value="Auto-generated" disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Payment due</span><select value={paymentDue} onChange={(e) => setPaymentDue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2"><option value="on_receipt">On Receipt</option><option value="7">Within 7 days</option><option value="15">Within 15 days</option><option value="30">Within 30 days</option></select></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Status</span><select value={status} onChange={(e) => setStatus(e.target.value as "active" | "draft")} className="rounded-lg border border-slate-300 px-3 py-2"><option value="active">Active</option><option value="draft">Draft</option></select></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Repeat monthly on</span><input type="number" min="1" max="28" value={repeatDay} onChange={(e) => setRepeatDay(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">First invoice</span><input type="date" value={firstInvoiceDate} onChange={(e) => { setFirstInvoiceDate(e.target.value); setNextInvoiceDate(e.target.value); }} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
                        </div>
                    </div>

                    <div className="border-y border-slate-200 bg-slate-100 px-6 py-3 text-sm font-semibold"><div className="grid grid-cols-[1fr_100px_140px_140px_44px] gap-3"><span>Items</span><span>Quantity</span><span>Price</span><span className="text-right">Amount</span><span /></div></div>
                    <div className="divide-y divide-slate-100">
                        {items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_100px_140px_140px_44px] gap-3 px-6 py-4">
                            <input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Item description" className="rounded-lg border border-slate-300 px-3 py-2" />
                            <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
                            <div className="py-2 text-right font-semibold">{money(item.quantity * item.unitPrice)}</div>
                            <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} disabled={items.length === 1} className="text-xl text-slate-400 disabled:opacity-30">×</button>
                        </div>)}
                    </div>
                    <button type="button" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unitPrice: 0 }])} className="mx-6 mb-6 font-semibold text-blue-700">＋ Add an Item</button>

                    <div className="grid gap-8 border-t border-slate-200 p-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">Notes / Terms</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Enter notes or terms of service that are visible to your customer" className="w-full rounded-xl border border-slate-300 p-3" />
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                            <div className="flex justify-between border-t border-slate-200 pt-4 text-xl"><strong>Total</strong><strong>{money(total)}</strong></div>
                        </div>
                    </div>
                    {message && <p className="mx-6 mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
                </section>

                <details className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <summary className="cursor-pointer font-semibold">Footer</summary>
                </details>

                <div className="mt-5 flex justify-end gap-3">
                    <Link href="/admin/invoices/recurring" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Cancel</Link>
                    <button type="button" onClick={save} disabled={saving} className="rounded-full bg-black px-6 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
                </div>
            </div>
        </main>
    );
}
