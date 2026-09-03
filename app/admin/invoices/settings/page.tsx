"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InvoiceSettingsPage() {
    const router = useRouter();
    const [businessName, setBusinessName] = useState("Glitz Of Diamonds");
    const [businessAddress, setBusinessAddress] = useState("");
    const [businessPhone, setBusinessPhone] = useState("");
    const [businessEmail, setBusinessEmail] = useState("");
    const [invoicePrefix, setInvoicePrefix] = useState("GOD");
    const [defaultTerms, setDefaultTerms] = useState("");
    const [footerText, setFooterText] = useState("");
    const [hasLogo, setHasLogo] = useState(false);
    const [logo, setLogo] = useState<File | null>(null);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (me.user?.role !== "admin") return setMessage("Only admins can manage invoice settings.");
            const res = await fetch("/api/admin/invoice-settings", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) return setMessage(data?.error || "Failed to load settings.");
            const s = data.settings || {};
            setBusinessName(s.business_name || "Glitz Of Diamonds");
            setBusinessAddress(s.business_address || "");
            setBusinessPhone(s.business_phone || "");
            setBusinessEmail(s.business_email || "");
            setInvoicePrefix(s.invoice_prefix || "GOD");
            setDefaultTerms(s.default_terms || "");
            setFooterText(s.footer_text || "");
            setHasLogo(Boolean(s.has_logo));
        }
        load();
    }, [router]);

    async function save(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const formData = new FormData();
            formData.append("businessName", businessName);
            formData.append("businessAddress", businessAddress);
            formData.append("businessPhone", businessPhone);
            formData.append("businessEmail", businessEmail);
            formData.append("invoicePrefix", invoicePrefix);
            formData.append("defaultTerms", defaultTerms);
            formData.append("footerText", footerText);
            if (logo) formData.append("logo", logo);
            const res = await fetch("/api/admin/invoice-settings", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save settings.");
            setHasLogo(Boolean(data.settings?.has_logo));
            setLogo(null);
            setMessage("Invoice settings saved.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-4xl">
                <header className="mb-6 flex items-center justify-between gap-4 px-4 sm:px-6"><div><h1 className="text-4xl font-bold text-white">Invoice settings</h1><p className="mt-1 text-sm text-white">Business details and branding shown on Glitz Of Diamonds invoices.</p></div><Link href="/admin/invoices" className="font-semibold text-white">Back to invoices</Link></header>
                <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-8 flex flex-wrap items-center gap-5 rounded-xl bg-slate-50 p-5">
                        {hasLogo ? <img src={`/api/invoice-logo?v=${Date.now()}`} alt="Invoice logo" className="h-24 max-w-64 rounded bg-white object-contain p-2" /> : <div className="flex h-24 w-44 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">No logo uploaded</div>}
                        <label className="text-sm font-semibold">Business logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogo(e.target.files?.[0] || null)} className="mt-2 block text-sm font-normal" /><span className="mt-1 block text-xs font-normal text-slate-400">PNG, JPG, or WEBP up to 4MB.</span></label>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="text-sm font-semibold">Business name<input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
                        <label className="text-sm font-semibold">Invoice prefix<input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} maxLength={20} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal uppercase" /></label>
                        <label className="text-sm font-semibold">Business email<input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
                        <label className="text-sm font-semibold">Business phone<input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" /></label>
                    </div>
                    <label className="mt-5 block text-sm font-semibold">Business address<textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
                    <label className="mt-5 block text-sm font-semibold">Default payment terms<textarea value={defaultTerms} onChange={(e) => setDefaultTerms(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="Example: Payment due within 30 days." /></label>
                    <label className="mt-5 block text-sm font-semibold">Invoice footer<textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="Thank you for your support of Glitz Of Diamonds." /></label>
                    {message && <p className={`mt-5 rounded-lg p-3 text-sm ${message.includes("saved") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{message}</p>}
                    <div className="mt-7 flex justify-end"><button type="submit" disabled={saving} className="rounded-full bg-blue-700 px-7 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save settings"}</button></div>
                </form>
            </div>
        </main>
    );
}
