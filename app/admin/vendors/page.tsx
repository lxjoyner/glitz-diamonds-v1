"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Vendor = {
    id: number;
    vendor_name: string;
    vendor_type: "regular" | "1099-nec";
    email: string | null;
};

export default function VendorsPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    async function loadVendors() {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/vendors", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to load vendors.");
            setVendors(data.vendors || []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load vendors.");
        } finally {
            setLoading(false);
        }
    }

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
            await loadVendors();
        }
        init();
    }, [router]);

    useEffect(() => {
        function closeMenu(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenuId(null);
        }
        document.addEventListener("mousedown", closeMenu);
        return () => document.removeEventListener("mousedown", closeMenu);
    }, []);

    async function removeVendor(vendor: Vendor) {
        if (!window.confirm(`Delete vendor "${vendor.vendor_name}"?`)) return;
        const res = await fetch(`/api/admin/vendors/${vendor.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            setMessage(data?.error || "Failed to delete vendor.");
            return;
        }
        setOpenMenuId(null);
        await loadVendors();
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-4xl font-bold tracking-tight">Vendors</h1>
                    <div className="flex gap-3">
                        <button type="button" className="rounded-full border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50">Import from... <span aria-hidden="true">⌄</span></button>
                        <Link href="/admin/vendors/new" className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Add a vendor</Link>
                    </div>
                </div>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-left">
                                    <th className="px-5 py-4">Type</th>
                                    <th className="px-5 py-4">Name</th>
                                    <th className="px-5 py-4">Email</th>
                                    <th className="px-5 py-4">Direct deposit</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading vendors...</td></tr>
                                ) : vendors.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No vendors yet. Add your first vendor.</td></tr>
                                ) : vendors.map((vendor) => (
                                    <tr key={vendor.id} className="border-b border-slate-100">
                                        <td className="px-5 py-5"><span className="inline-flex min-w-28 justify-center rounded-md bg-slate-200 px-4 py-1 font-semibold">Vendor</span></td>
                                        <td className="px-5 py-5 text-lg">{vendor.vendor_name}</td>
                                        <td className="px-5 py-5">{vendor.email || ""}</td>
                                        <td className="px-5 py-5 text-slate-600">Not available</td>
                                        <td className="px-5 py-5">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link href={`/admin/vendors/${vendor.id}/create-bill`} className="font-semibold text-blue-700 hover:underline">Create bill</Link>
                                                <div className="relative" ref={openMenuId === vendor.id ? menuRef : null}>
                                                    <button type="button" aria-label={`Vendor actions for ${vendor.vendor_name}`} onClick={() => setOpenMenuId((current) => current === vendor.id ? null : vendor.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-600 text-blue-700 hover:bg-blue-50">⌄</button>
                                                    {openMenuId === vendor.id && (
                                                        <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                                                            <Link href={`/admin/vendors/${vendor.id}/edit`} className="block px-4 py-2 hover:bg-slate-50">Edit</Link>
                                                            <Link href={`/admin/vendors/${vendor.id}/create-bill`} className="block px-4 py-2 hover:bg-slate-50">Create bill</Link>
                                                            <button type="button" onClick={() => removeVendor(vendor)} className="block w-full px-4 py-2 text-left hover:bg-slate-50">Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
