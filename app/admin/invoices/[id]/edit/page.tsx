"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InvoiceDatePicker from "@/components/InvoiceDatePicker";

type Member = { id: number; full_name: string; email: string; address?: string };
type LineItem = { description: string; quantity: number; unitPrice: number };
type InvoiceData = {
    id: number;
    invoice_number: string;
    member_id: number;
    member_name: string | null;
    member_email: string | null;
    invoice_date: string;
    due_date: string;
    reference_number: string | null;
    discount_cents: number;
    tax_cents: number;
    notes: string | null;
    terms: string | null;
    items: Array<{ description: string; quantity: number | string; unit_price_cents: number }>;
};

type InvoiceSettings = {
    business_name?: string;
    business_address?: string;
    business_phone?: string;
    business_email?: string;
    has_logo?: boolean | number;
    footer_text?: string;
};

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const dateOnly = (value: string) => String(value || "").slice(0, 10);

export default function EditInvoicePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [memberId, setMemberId] = useState("");
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [invoiceDate, setInvoiceDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [items, setItems] = useState<LineItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("");
    const [settings, setSettings] = useState<InvoiceSettings>({ business_name: "Glitz Of Diamonds" });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch("/api/admin/me", { cache: "no-store" });
                const me = await meRes.json();
                if (!me?.authenticated) return router.push("/admin/login");
                if (!["admin", "treasurer"].includes(me.user?.role)) throw new Error("Only admins and treasurers can edit invoices.");

                const [invoiceRes, usersRes, settingsRes] = await Promise.all([
                    fetch(`/api/admin/invoices/${params.id}`, { cache: "no-store" }),
                    fetch("/api/admin/users", { cache: "no-store" }),
                    me.user?.role === "admin" ? fetch("/api/admin/invoice-settings", { cache: "no-store" }) : Promise.resolve(null),
                ]);
                const invoiceData = await invoiceRes.json();
                if (!invoiceRes.ok) throw new Error(invoiceData?.error || "Failed to load invoice.");
                const record = invoiceData.invoice as InvoiceData;
                setInvoice(record);
                setMemberId(String(record.member_id));
                setInvoiceDate(dateOnly(record.invoice_date));
                setDueDate(dateOnly(record.due_date));
                setReferenceNumber(record.reference_number || "");
                setDiscount(Number(record.discount_cents || 0) / 100);
                setTax(Number(record.tax_cents || 0) / 100);
                setNotes(record.notes || "");
                setTerms(record.terms || "");
                setItems((record.items || []).map((item) => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unit_price_cents) / 100,
                })));

                if (usersRes.ok) {
                    const users = await usersRes.json();
                    setMembers((users.users || []).filter((user: Member) => user.email));
                }
                if (settingsRes?.ok) {
                    const settingsData = await settingsRes.json();
                    if (settingsData?.settings) setSettings(settingsData.settings);
                }
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to load invoice.");
            }
        }
        load();
    }, [params.id, router]);

    const selectedMember = members.find((member) => String(member.id) === memberId) || (invoice ? {
        id: invoice.member_id,
        full_name: invoice.member_name || `Member #${invoice.member_id}`,
        email: invoice.member_email || "",
        address: "",
    } : undefined);

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0), [items]);
    const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));

    function updateItem(index: number, field: keyof LineItem, value: string) {
        setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: field === "description" ? value : Number(value) } : item));
    }

    async function saveInvoice() {
        setMessage("");
        if (!memberId) return setMessage("Select a member before saving.");
        if (!invoiceDate || !dueDate) return setMessage("Invoice date and payment due date are required.");
        if (items.length === 0 || items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) return setMessage("Complete all invoice line items before saving.");
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/invoices/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, invoiceDate, dueDate, referenceNumber, items, discount, tax, notes, terms }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Failed to update invoice.");
            router.push("/admin/invoices");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to update invoice.");
        } finally {
            setSaving(false);
        }
    }

    if (!invoice && !message) {
        return <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8"><div className="mx-auto max-w-[1500px]"><p className="rounded-xl bg-white p-6 shadow-sm">Loading invoice...</p></div></main>;
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex min-h-[108px] flex-wrap items-center justify-between gap-5 px-4 py-5 sm:px-6 sm:py-6">
                    <h1 className="text-4xl font-bold tracking-tight leading-tight text-white">Edit invoice {invoice ? `#${invoice.invoice_number}` : ""}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => window.print()} className="rounded-full border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700">Preview</button>
                        <button type="button" onClick={saveInvoice} disabled={saving || !invoice} className="rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
                    </div>
                </header>

                <details className="mb-6 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                    <summary className="cursor-pointer bg-white px-5 py-4 font-semibold">Business address and contact details, title, summary, and logo</summary>
                    <div className="grid gap-6 border-t border-slate-200 p-5 md:grid-cols-2">
                        <div>{settings.has_logo ? <img src="/api/invoice-logo" alt="Invoice logo" className="h-36 max-w-64 object-contain" /> : <div className="flex h-28 w-44 items-center justify-center rounded border border-dashed border-slate-300 text-sm text-slate-400">No invoice logo</div>}</div>
                        <div className="text-sm md:text-right"><p className="font-bold">{settings.business_name || "Glitz Of Diamonds"}</p>{settings.business_address ? <p className="whitespace-pre-line">{settings.business_address}</p> : null}{settings.business_phone ? <p>{settings.business_phone}</p> : null}{settings.business_email ? <p>{settings.business_email}</p> : null}</div>
                    </div>
                </details>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
                        <div>
                            <p className="text-xs font-semibold">Bill to</p>
                            <p className="mt-1 text-lg font-semibold">{selectedMember?.full_name || "Member"}</p>
                            {selectedMember?.address ? <p className="mt-1 whitespace-pre-line text-sm">{selectedMember.address}</p> : null}
                            {selectedMember?.email ? <p className="mt-4 text-sm">{selectedMember.email}</p> : null}
                            <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-blue-700">
                                <button type="button" onClick={() => setShowMemberPicker((value) => !value)}>Edit {selectedMember?.full_name || "customer"}</button>
                                <span>•</span>
                                <button type="button" onClick={() => setShowMemberPicker((value) => !value)}>Choose a different customer</button>
                            </div>
                            {showMemberPicker ? <select value={memberId} onChange={(e) => { setMemberId(e.target.value); setShowMemberPicker(false); }} className="mt-3 w-full max-w-md rounded-xl border border-slate-300 px-4 py-3"><option value="">Select a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}</select> : null}
                        </div>

                        <div className="space-y-4">
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Invoice number</span><input value={invoice?.invoice_number || ""} disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">P.O./S.O. number</span><input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Invoice date</span><InvoiceDatePicker value={invoiceDate} onChange={setInvoiceDate} ariaLabel="Invoice date" /></label>
                            <label className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm"><span className="font-semibold">Payment due</span><InvoiceDatePicker value={dueDate} onChange={setDueDate} ariaLabel="Payment due date" /></label>
                        </div>
                    </div>

                    <div className="border-y border-slate-200 bg-slate-100 px-6 py-4">
                        <button type="button" className="mb-4 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm">✎ Edit columns</button>
                        <div className="grid grid-cols-[1fr_100px_140px_140px_44px] gap-3 text-sm font-semibold"><span>Items</span><span>Quantity</span><span>Price</span><span className="text-right">Amount</span><span /></div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {items.map((item, index) => <div key={index} className="grid grid-cols-[1fr_100px_140px_140px_44px] gap-3 px-6 py-4">
                            <input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Item description" className="rounded-lg border border-slate-300 px-3 py-2" />
                            <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
                            <div className="py-2 text-right font-semibold">{money(item.quantity * item.unitPrice)}</div>
                            <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} disabled={items.length === 1} className="text-xl text-blue-700 disabled:opacity-30" aria-label="Remove item">⌫</button>
                        </div>)}
                    </div>
                    <button type="button" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unitPrice: 0 }])} className="mx-6 mb-6 font-semibold text-blue-700">＋ Add an item</button>

                    <div className="grid gap-8 border-t border-slate-200 p-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold">Notes / Terms</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Notes visible to the member" className="w-full rounded-xl border border-slate-300 p-3" />
                            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="Payment terms" className="mt-3 w-full rounded-xl border border-slate-300 p-3" />
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                            <label className="flex items-center justify-between gap-4"><span className="font-semibold text-blue-700">＋ Add a discount</span><input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right" /></label>
                            <label className="flex items-center justify-between gap-4"><span>Tax</span><input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right" /></label>
                            <div className="flex justify-between border-t border-slate-200 pt-4 text-xl"><strong>Total</strong><strong>{money(total)}</strong></div>
                            <div className="flex justify-between border-t border-slate-200 pt-4 text-lg"><strong>Amount Due</strong><strong>{money(total)}</strong></div>
                        </div>
                    </div>
                    {message ? <p className="mx-6 mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p> : null}
                </section>

                <details className="mt-5 rounded-xl border border-slate-300 bg-white px-5 py-4 shadow-sm"><summary className="cursor-pointer font-semibold">Footer</summary><div className="mt-4 text-sm text-slate-600">{settings.footer_text || "No footer text configured."}</div></details>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Attachments</h2>
                    <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-blue-300 bg-slate-50 text-center text-slate-500">
                        <div><p className="font-semibold">Attachments are not enabled yet.</p><p className="mt-1 text-sm">A future update can add file uploads to invoices.</p></div>
                    </div>
                </section>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <Link href="/admin/invoices" className="rounded-full border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700">Cancel</Link>
                    <button type="button" onClick={() => window.print()} className="rounded-full border border-blue-600 bg-white px-5 py-3 font-semibold text-blue-700">Preview</button>
                    <button type="button" onClick={saveInvoice} disabled={saving || !invoice} className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
                </div>
            </div>
        </main>
    );
}
