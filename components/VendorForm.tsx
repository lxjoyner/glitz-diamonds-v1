"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type VendorFormValue = {
    vendorName: string;
    vendorType: "regular" | "1099-nec";
    firstName: string;
    lastName: string;
    currency: string;
    email: string;
    country: string;
    provinceState: string;
    address1: string;
    address2: string;
    city: string;
    postalCode: string;
    additionalInfo: string;
};

const emptyVendor: VendorFormValue = {
    vendorName: "",
    vendorType: "regular",
    firstName: "",
    lastName: "",
    currency: "USD",
    email: "",
    country: "",
    provinceState: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    additionalInfo: "",
};

export default function VendorForm({ vendorId }: { vendorId?: number }) {
    const router = useRouter();
    const editing = Boolean(vendorId);
    const [value, setValue] = useState<VendorFormValue>(emptyVendor);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function init() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) {
                setMessage("Only admins and treasurers can manage vendors.");
                setLoading(false);
                return;
            }

            if (!vendorId) return setLoading(false);
            const res = await fetch(`/api/admin/vendors/${vendorId}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                setMessage(data?.error || "Failed to load vendor.");
                setLoading(false);
                return;
            }
            const v = data.vendor;
            setValue({
                vendorName: v.vendor_name || "",
                vendorType: v.vendor_type === "1099-nec" ? "1099-nec" : "regular",
                firstName: v.first_name || "",
                lastName: v.last_name || "",
                currency: v.currency || "USD",
                email: v.email || "",
                country: v.country || "",
                provinceState: v.province_state || "",
                address1: v.address1 || "",
                address2: v.address2 || "",
                city: v.city || "",
                postalCode: v.postal_code || "",
                additionalInfo: v.additional_info || "",
            });
            setLoading(false);
        }
        init();
    }, [router, vendorId]);

    function update<K extends keyof VendorFormValue>(key: K, next: VendorFormValue[K]) {
        setValue((current) => ({ ...current, [key]: next }));
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch(editing ? `/api/admin/vendors/${vendorId}` : "/api/admin/vendors", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(value),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save vendor.");
            router.push("/admin/vendors");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to save vendor.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-8"><div className="mx-auto max-w-4xl">Loading vendor...</div></main>;

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-4xl">
                <h1 className="mb-8 text-4xl font-bold tracking-tight">{editing ? "Edit a vendor" : "Add a vendor"}</h1>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <form onSubmit={submit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
                    <label className="grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
                        <span className="font-semibold text-slate-700">Vendor Name<span className="text-red-600">*</span></span>
                        <input value={value.vendorName} onChange={(e) => update("vendorName", e.target.value)} required className="rounded-xl border border-blue-300 px-4 py-3" />
                    </label>

                    <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                        <span className="font-semibold text-slate-700">Type</span>
                        <div className="space-y-4">
                            <label className="flex items-start gap-3">
                                <input type="radio" name="vendorType" checked={value.vendorType === "regular"} onChange={() => update("vendorType", "regular")} className="mt-1 h-5 w-5" />
                                <span><span className="font-medium">Regular</span><span className="block text-sm text-slate-600">Companies that provide goods and services to your business (e.g. Internet and utility providers).</span></span>
                            </label>
                            <label className="flex items-start gap-3">
                                <input type="radio" name="vendorType" checked={value.vendorType === "1099-nec"} onChange={() => update("vendorType", "1099-nec")} className="mt-1 h-5 w-5" />
                                <span><span className="font-medium">1099-NEC contractor</span><span className="block text-sm text-slate-600">Contractors that perform a service for which you pay them and provide a 1099-NEC form.</span></span>
                            </label>
                        </div>
                    </div>

                    {editing && <hr className="border-slate-200" />}

                    <div className="grid gap-5">
                        {[
                            ["firstName", "First name"],
                            ["lastName", "Last name"],
                            ["email", "Email"],
                            ["country", "Country"],
                            ["provinceState", "Province/State"],
                            ["address1", "Address line 1"],
                            ["address2", "Address line 2"],
                            ["city", "City"],
                            ["postalCode", "Postal/Zip code"],
                        ].map(([key, label]) => (
                            <label key={key} className="grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
                                <span className="font-semibold text-slate-700">{label}</span>
                                <input value={value[key as keyof VendorFormValue] as string} onChange={(e) => update(key as keyof VendorFormValue, e.target.value as never)} placeholder="(Optional)" className="rounded-xl border border-blue-300 px-4 py-3" />
                            </label>
                        ))}

                        <label className="grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
                            <span className="font-semibold text-slate-700">Currency</span>
                            <select value={value.currency} onChange={(e) => update("currency", e.target.value)} className="rounded-xl border border-blue-300 px-4 py-3">
                                <option value="USD">USD - U.S. dollar</option>
                            </select>
                        </label>

                        <label className="grid gap-2 md:grid-cols-[180px_1fr] md:items-start">
                            <span className="font-semibold text-slate-700">Additional information</span>
                            <textarea value={value.additionalInfo} onChange={(e) => update("additionalInfo", e.target.value)} rows={4} placeholder="(Optional)" className="rounded-xl border border-blue-300 px-4 py-3" />
                        </label>
                    </div>

                    <div className="pl-0 md:pl-[180px]">
                        <button disabled={saving} className="rounded-full bg-blue-700 px-8 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                    </div>
                </form>
            </div>
        </main>
    );
}
