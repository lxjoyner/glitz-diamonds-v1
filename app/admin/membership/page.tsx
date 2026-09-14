"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = { id: string; username: string; role: string };
type Member = { id: number; username: string; email: string; full_name: string; address: string; tshirt_size: string; favorite_color: string; hat_size: string; gender: string; birthday: string; role: string | null; created_at: string };

function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

function formatBirthday(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    if (digits.length === 8) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    return value || "—";
}

export default function MembershipPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const meData = await meRes.json();
            if (!meData?.authenticated) return router.push("/admin/login");
            if (meData.user?.role !== "admin") {
                setError("Only admins can access the membership page.");
                setUser(meData.user);
                return;
            }
            setUser(meData.user);
            const memberRes = await fetch("/api/admin/users", { cache: "no-store" });
            const memberData = await memberRes.json();
            if (!memberRes.ok) throw new Error(memberData?.error || "Failed to load members.");
            setMembers(memberData.users || []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Failed to load members.");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => { loadData(); }, [loadData]);

    async function handleDeleteMember(member: Member) {
        if (!window.confirm(`Delete ${member.full_name} and all saved registration data? This cannot be undone.`)) return;
        setError("");
        setSuccess("");
        try {
            const response = await fetch("/api/admin/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: member.id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Failed to delete member.");
            setSuccess(`${member.full_name} was removed successfully.`);
            setMembers((prev) => prev.filter((item) => item.id !== member.id));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "Failed to delete member.");
        }
    }

    return (
        <main className="min-h-screen bg-black px-6 py-10 text-white">
            <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">Membership</h1>
                        <p className="mt-1 text-sm text-slate-300">Registered Users Details from the registration form.</p>
                    </div>
                    <button type="button" onClick={() => router.push("/admin/messages")} className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">Back to dashboard</button>
                </div>

                {user && <p className="mb-4 text-sm text-slate-400">Signed in as {user.username} ({user.role})</p>}
                {success && <p className="mb-4 text-sm text-emerald-400">{success}</p>}
                {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

                {loading ? <p className="text-sm text-slate-300">Loading members...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1280px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-white/15 text-left text-slate-300">
                                    <th className="px-3 py-3">Name</th><th className="px-3 py-3">Username</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Address</th><th className="px-3 py-3">T-Shirt Size</th><th className="px-3 py-3">Favorite Color</th><th className="px-3 py-3">Jacket Size</th><th className="px-3 py-3">Gender</th><th className="px-3 py-3">Birthday</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Member Since</th><th className="px-3 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id} className="border-b border-white/10 hover:bg-white/[0.03]">
                                        <td className="px-3 py-3">{member.full_name}</td><td className="px-3 py-3">{member.username}</td><td className="px-3 py-3">{member.email}</td><td className="px-3 py-3">{member.address || "—"}</td><td className="px-3 py-3">{member.tshirt_size || "—"}</td><td className="px-3 py-3">{member.favorite_color || "—"}</td><td className="px-3 py-3">{member.hat_size || "—"}</td><td className="px-3 py-3 capitalize">{member.gender || "—"}</td><td className="px-3 py-3">{formatBirthday(member.birthday)}</td><td className="px-3 py-3 capitalize">{member.role || "none"}</td><td className="px-3 py-3">{formatDate(member.created_at)}</td>
                                        <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Link href={`/admin/membership/${member.id}/edit`} className="rounded-md border border-blue-400/40 bg-blue-900/30 px-3 py-1.5 text-xs text-blue-100 hover:bg-blue-900/50">Edit profile</Link><button type="button" onClick={() => handleDeleteMember(member)} className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-900/50">Delete member</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {members.length === 0 && <p className="py-6 text-sm text-slate-400">No members found.</p>}
                    </div>
                )}
            </div>
        </main>
    );
}
