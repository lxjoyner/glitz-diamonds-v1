"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const T_SHIRT_SIZES = ["XS", "SM", "M", "MD", "LG", "XL", "XXL", "XXXL", "XXXXL"];
const JACKET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"];
const GENDERS = ["Male", "Female"];

type Profile = {
    id: number;
    username: string;
    email: string;
    fullName: string;
    address: string;
    tshirtSize: string;
    favoriteColor: string;
    jacketSize: string;
    gender: string;
    birthday: string;
    role: string | null;
    isActive: boolean;
};

function formatBirthday(value: string) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
    return digits.length === 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function AdminEditMemberProfilePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState({ fullName: "", email: "", address: "", tshirtSize: "M", favoriteColor: "", jacketSize: "", gender: "", birthday: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch("/api/admin/me", { cache: "no-store" });
                const me = await meRes.json();
                if (!me?.authenticated) return router.push("/admin/login");
                if (me.user?.role !== "admin") throw new Error("Only admins can edit member profiles.");

                const res = await fetch(`/api/admin/users/${params.id}`, { cache: "no-store" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to load member profile.");
                const record = data.profile as Profile;
                setProfile(record);
                setForm({
                    fullName: record.fullName || "",
                    email: record.email || "",
                    address: record.address || "",
                    tshirtSize: record.tshirtSize || "M",
                    favoriteColor: record.favoriteColor || "",
                    jacketSize: record.jacketSize || "",
                    gender: record.gender || "",
                    birthday: formatBirthday(record.birthday),
                });
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to load member profile.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.id, router]);

    function onChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const { name } = event.target;
        let value = event.target.value;
        if (name === "birthday") {
            const digits = value.replace(/\D/g, "").slice(0, 4);
            value = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
        }
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/users/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to update member profile.");
            setMessage("Member profile updated successfully.");
            if (data.profile) setProfile(data.profile);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to update member profile.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <main className="min-h-screen bg-black px-6 py-10 text-white"><div className="mx-auto max-w-3xl">Loading member profile...</div></main>;
    }

    return (
        <main className="min-h-screen bg-black px-6 py-10 text-white">
            <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-semibold">Edit Member Profile</h1>
                        <p className="mt-1 text-sm text-slate-300">Admin can update this member's registration details.</p>
                    </div>
                    <Link href="/admin/membership" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Back to Membership</Link>
                </div>

                {profile && (
                    <div className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-black/30 p-4 sm:grid-cols-3">
                        <div><p className="text-xs uppercase text-slate-400">Username</p><p className="font-medium">{profile.username}</p></div>
                        <div><p className="text-xs uppercase text-slate-400">Role</p><p className="font-medium capitalize">{profile.role || "none"}</p></div>
                        <div><p className="text-xs uppercase text-slate-400">Status</p><p className="font-medium">{profile.isActive ? "Active" : "Inactive"}</p></div>
                    </div>
                )}

                <form onSubmit={save} className="space-y-4">
                    <label className="block"><span className="mb-1 block text-sm text-slate-300">Full Name</span><input name="fullName" value={form.fullName} onChange={onChange} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                    <label className="block"><span className="mb-1 block text-sm text-slate-300">Email</span><input type="email" name="email" value={form.email} onChange={onChange} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                    <label className="block"><span className="mb-1 block text-sm text-slate-300">Address</span><textarea name="address" value={form.address} onChange={onChange} rows={3} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block"><span className="mb-1 block text-sm text-slate-300">T-Shirt Size</span><select name="tshirtSize" value={form.tshirtSize} onChange={onChange} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2">{T_SHIRT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                        <label className="block"><span className="mb-1 block text-sm text-slate-300">Jacket Size</span><select name="jacketSize" value={form.jacketSize} onChange={onChange} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"><option value="">Select size</option>{JACKET_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block"><span className="mb-1 block text-sm text-slate-300">Favorite Color</span><input name="favoriteColor" value={form.favoriteColor} onChange={onChange} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                        <label className="block"><span className="mb-1 block text-sm text-slate-300">Gender</span><select name="gender" value={form.gender} onChange={onChange} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"><option value="">Select gender</option>{GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label>
                    </div>
                    <label className="block"><span className="mb-1 block text-sm text-slate-300">Birthday (MM/DD)</span><input name="birthday" value={form.birthday} onChange={onChange} inputMode="numeric" placeholder="MM/DD" maxLength={5} required className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>

                    {message && <p className="rounded-lg bg-black/30 px-3 py-2 text-sm text-slate-200">{message}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <Link href="/admin/membership" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Cancel</Link>
                        <button type="submit" disabled={saving} className="rounded-lg bg-red-800 px-5 py-2 font-medium hover:bg-red-600 disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
                    </div>
                </form>
            </div>
        </main>
    );
}
