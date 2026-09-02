"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: number; full_name: string; email: string };
type LineItem = { description: string; quantity: number; unitPrice: number };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function NewInvoicePage() {
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [memberId, setMemberId] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(today());
    const [dueDate, setDueDate] = useState(today());
    const [referenceNumber, setReferenceNumber] = useState("");
    const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("");
    const [businessName, setBusinessName] = useState("Glitz Of Diamonds");
    const [hasLogo, setHasLogo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) return setMessage("Only admins and treasurers can create invoices.");
            const [usersRes, settingsRes] = await Promise.all([
                fetch("/api/admin/users", { cache: "no-store" }),
                me.user?.role === "admin" ? fetch("/api/admin/invoice-settings", { cache: "no-store" }) : Promise.resolve(null),
            ]);
            const users = await usersRes.json();
            if (usersRes.ok) setMembers((users.users || []).filter((u: Member) => u.email));
            if (settingsRes) {
                const settings = await settingsRes.json();
                if (settings?.settings) {
                    setBusinessName(settings.settings.business_name || "Glitz Of Diamonds");
                    setHasLogo(Boolean(settings.settings.has_logo));
                    setTerms(settings.settings.default_terms || "");
                }
            }
        }
        load();
    }, [router]);

    const selectedMember = members.find((member) => String(member.id) === memberId);
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0), [items]);
    const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));

    function updateItem(index: number, field: keyof LineItem, value: string) {
        setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: field === "description" ? value : Number(value) } : item));
    }

    async function saveInvoice() {
        setMessage("");
        if (!memberId) return setMessage("Select a member before saving the invoice.");
        if (items.some((item) => !item.description.trim() || item.quantity <= 0)) return setMessage("Complete all invoice line items before saving.");
        setSaving(true);
        try {
            const response = await fetch("/api/admin/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, invoiceDate, dueDate, referenceNumber, items, discount, tax, notes, terms }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Failed to save invoice.");
            router.push("/admin/invoices");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to save invoice.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white">New invoice</h1>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => window.print()} className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Preview</button>
                        <button type="button" onClick={saveInvoice} disabled={saving} className="rounded-full bg-blue-700 px-6 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
                    </div>
                </header>

                <details className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <summary className="cursor-pointer font-semibold">Business address and contact details, title, summary, and logo</summary>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        {hasLogo ? <img src={`/api/invoice-logo?v=${Date.now()}`} alt="Business logo" className="h-16 max-w-48 object-contain" /> : <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs">No logo</div>}
                        <div><p className="text-base font-semibold text-slate-900">{businessName}</p><p>Manage invoice branding in Invoice settings.</p></div>
                        <Link href="/admin/invoices/settings" className="ml-auto font-semibold text-blue-700">Edit settings</Link>
                    </div>
                </details>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">Bill to</label>
                            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                                <option value="">Select a Women&apos;s Group member</option>
                                {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}
                            </select>
                            <div className="mt-4 min-h-32 rounded-xl border border-slate-200 bg-slate-50 p-5">
                                {selectedMember ? <><p className="font-semibold text-slate-900">{selectedMember.full_name}</p><p className="mt-1 text-sm text-slate-500">{selectedMember.email}</p><p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Member #{selectedMember.id}</p></> : <p className="text-sm text-slate-400">Choose a member to populate billing details.</p>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Invoice number</span><input value="Auto-generated" disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">P.O./Reference</span><input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Invoice date</span><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Payment due</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
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
                    <button type="button" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unitPrice: 0 }])} className="mx-6 mb-6 font-semibold text-blue-700">＋ Add an item</button>

                    <div className="grid gap-8 border-t border-slate-200 p-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">Notes / Terms</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Notes visible to the member" className="w-full rounded-xl border border-slate-300 p-3" />
                            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="Payment terms" className="mt-3 w-full rounded-xl border border-slate-300 p-3" />
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                            <label className="flex items-center justify-between gap-4"><span>Discount</span><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right" /></label>
                            <label className="flex items-center justify-between gap-4"><span>Tax</span><input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right" /></label>
                            <div className="flex justify-between border-t border-slate-200 pt-4 text-xl"><strong>Total</strong><strong>{money(total)}</strong></div>
                            <div className="flex justify-between border-t border-slate-200 pt-4 text-lg"><strong>Amount Due</strong><strong>{money(total)}</strong></div>
                        </div>
                    </div>
                    {message && <p className="mx-6 mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
                </section>

                <div className="mt-5"><Link href="/admin/invoices" className="font-semibold text-blue-700">← Back to invoices</Link></div>
            </div>
        </main>
    );
}
