"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: number; full_name: string; email: string };

const today = () => new Date().toISOString().slice(0, 10);

export default function NewRecurringInvoicePage() {
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [memberId, setMemberId] = useState("");
    const [status, setStatus] = useState<"active" | "draft">("active");
    const [repeatDay, setRepeatDay] = useState(1);
    const [firstInvoiceDate, setFirstInvoiceDate] = useState(today());
    const [nextInvoiceDate, setNextInvoiceDate] = useState(today());
    const [amount, setAmount] = useState(25);
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

    async function save() {
        setMessage("");
        setSaving(true);
        try {
            const res = await fetch("/api/admin/recurring-invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, status, repeatDay, firstInvoiceDate, nextInvoiceDate, amount, notes }),
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
                        <Link href="/admin/invoices/recurring" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700">Cancel</Link>
                        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-black px-6 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-60">{saving ? "Saving..." : "Save recurring invoice"}</button>
                    </div>
                </header>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        <label className="text-sm font-semibold">Customer
                            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal">
                                <option value="">Select a Women&apos;s Group member</option>
                                {members.map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}
                            </select>
                        </label>
                        <label className="text-sm font-semibold">Status
                            <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "draft")} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal">
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                            </select>
                        </label>
                        <label className="text-sm font-semibold">Repeat monthly on day
                            <input type="number" min="1" max="28" value={repeatDay} onChange={(e) => setRepeatDay(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
                        </label>
                        <label className="text-sm font-semibold">Invoice amount
                            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
                        </label>
                        <label className="text-sm font-semibold">First invoice date
                            <input type="date" value={firstInvoiceDate} onChange={(e) => setFirstInvoiceDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
                        </label>
                        <label className="text-sm font-semibold">Next invoice date
                            <input type="date" value={nextInvoiceDate} onChange={(e) => setNextInvoiceDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
                        </label>
                    </div>
                    <label className="mt-6 block text-sm font-semibold">Notes
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />
                    </label>
                    {message && <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
                </section>
            </div>
        </main>
    );
}
