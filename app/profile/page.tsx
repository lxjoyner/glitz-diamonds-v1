"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const T_SHIRT_SIZES = ["XS", "SM", "M", "LG", "XL", "XXL", "XXXL", "XXXXL"];
const JACKET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"];
const GENDERS = ["Male", "Female"];

type Profile = {
    username: string;
    email: string;
    fullName: string;
    address: string;
    tshirtSize: string;
    favoriteColor: string;
    jacketSize: string;
    gender: string;
    birthday: string;
    role?: string | null;
    isActive?: boolean;
};

function formatBirthday(value: string) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch("/api/admin/me", { cache: "no-store" });
                const me = await meRes.json();
                if (!me?.authenticated) {
                    router.push("/admin/login");
                    return;
                }

                const res = await fetch("/api/profile", { cache: "no-store" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to load profile.");

                const loaded: Profile = {
                    ...data.profile,
                    birthday: formatBirthday(data.profile?.birthday || ""),
                };
                setProfile(loaded);
                setForm(loaded);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [router]);

    function updateField(name: keyof Profile, value: string) {
        setForm((current) => current ? { ...current, [name]: name === "birthday" ? formatBirthday(value) : value } : current);
        setMessage("");
        setError("");
    }

    async function save() {
        if (!form) return;
        setSaving(true);
        setMessage("");
        setError("");
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save profile.");
            const saved = { ...form };
            setProfile(saved);
            setForm(saved);
            setMessage("Profile updated successfully.");
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save profile.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <main className="min-h-screen bg-black px-4 py-12 text-white"><div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6">Loading profile...</div></main>;
    if (!form) return <main className="min-h-screen bg-black px-4 py-12 text-white"><div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">{error || "Profile unavailable."}</div></main>;

    return (
        <main className="min-h-screen bg-black px-4 py-12 text-white">
            <div className="mx-auto max-w-4xl">
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold">My Profile</h1>
                            <p className="mt-2 text-sm text-slate-300">Review and update your member information.</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
                            <div><span className="font-semibold text-white">Username:</span> {form.username}</div>
                            <div><span className="font-semibold text-white">Status:</span> {form.isActive ? "Active" : "Inactive"}</div>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-5 md:grid-cols-2">
                        <label className="space-y-1"><span className="text-sm text-slate-300">Full Name</span><input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">Email</span><input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                        <label className="space-y-1 md:col-span-2"><span className="text-sm text-slate-300">Address</span><input value={form.address} onChange={(e) => updateField("address", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">T-Shirt Size</span><select value={form.tshirtSize} onChange={(e) => updateField("tshirtSize", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black px-3 py-2">{T_SHIRT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">Jacket Size</span><select value={form.jacketSize} onChange={(e) => updateField("jacketSize", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black px-3 py-2"><option value="">Select size</option>{JACKET_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">Favorite Color</span><input value={form.favoriteColor} onChange={(e) => updateField("favoriteColor", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">Gender</span><select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} className="w-full rounded-lg border border-white/15 bg-black px-3 py-2"><option value="">Select gender</option>{GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">Birthday (MM/DD)</span><input inputMode="numeric" value={form.birthday} onChange={(e) => updateField("birthday", e.target.value)} placeholder="MM/DD" maxLength={5} className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2" /></label>
                        <label className="space-y-1"><span className="text-sm text-slate-300">Role</span><input value={form.role || "member"} disabled className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-400" /></label>
                    </div>

                    {message && <p className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                    {error && <p className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

                    <div className="mt-6 flex flex-wrap justify-end gap-3">
                        <button type="button" onClick={() => { setForm(profile); setMessage(""); setError(""); }} className="rounded-full border border-white/20 px-5 py-2.5 font-semibold hover:bg-white/10">Cancel changes</button>
                        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-fuchsia-700 px-6 py-2.5 font-semibold hover:bg-fuchsia-600 disabled:opacity-60">{saving ? "Saving..." : "Save profile"}</button>
                    </div>
                </section>
            </div>
        </main>
    );
}
