"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = {
    id: string;
    username: string;
    role: string;
};

type InviteRecord = {
    id: number;
    invited_by_username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    email_sent_at: string | null;
    email_opened_at: string | null;
    registration_completed_at: string | null;
    created_at: string;
};

function dateTime(value: string | null) {
    return value ? new Date(value).toLocaleString() : "—";
}

export default function MemberInvitesPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [invites, setInvites] = useState<InviteRecord[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);

    const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "", email: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [smsLink, setSmsLink] = useState("");
    const [emailLink, setEmailLink] = useState("");
    const [copyMessage, setCopyMessage] = useState("");
    const [emailStatusMessage, setEmailStatusMessage] = useState("");

    async function loadInviteHistory() {
        setLoadingInvites(true);
        try {
            const res = await fetch("/api/admin/member-invites", { cache: "no-store" });
            const data = await res.json();
            if (res.ok && data?.success) setInvites(data.invites || []);
        } finally {
            setLoadingInvites(false);
        }
    }

    useEffect(() => {
        async function loadMe() {
            try {
                const res = await fetch("/api/admin/me", { cache: "no-store" });
                const data = await res.json();
                if (!data?.authenticated) {
                    router.replace("/admin/login");
                    return;
                }
                setUser(data.user);
                if (data.user?.role === "admin") await loadInviteHistory();
            } finally {
                setLoadingAuth(false);
            }
        }
        loadMe();
    }, [router]);

    const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name } = event.target;
        let { value } = event.target;
        if (name === "phoneNumber") value = value.replace(/\D/g, "").slice(0, 10);
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        setCopyMessage("");
        setInviteLink("");
        setSmsLink("");
        setEmailLink("");
        setEmailStatusMessage("");

        try {
            const res = await fetch("/api/admin/member-invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to create invite link.");
            setInviteLink(data.inviteLink || "");
            setSmsLink(data.smsLink || "");
            setEmailLink(data.emailLink || "");
            setEmailStatusMessage(data.inviteEmailSent ? `Invite email sent to ${form.email}.` : "Invite email could not be sent automatically. Please copy the invite link below and send it manually.");
            await loadInviteHistory();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Failed to create invite link.");
        } finally {
            setSubmitting(false);
        }
    };

    const copyInviteLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopyMessage("Link copied to clipboard.");
        } catch {
            setCopyMessage("Could not copy automatically on this device. Please copy the link manually.");
        }
    };

    if (loadingAuth) return <main className="min-h-screen bg-black text-white px-4 py-12"><div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">Loading...</div></main>;

    if (!isAdmin) {
        return <main className="min-h-screen bg-black text-white px-4 py-12"><div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6"><h1 className="text-2xl font-semibold">Admin Access Required</h1><p className="mt-2 text-sm text-red-100">Only admins can create member registration invite links.</p><Link href="/admin/messages" className="mt-4 inline-flex text-sm underline">Return to dashboard</Link></div></main>;
    }

    return (
        <main className="min-h-screen bg-black text-white px-4 py-12">
            <div className="mx-auto max-w-[1500px] space-y-8">
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h1 className="text-3xl font-semibold">Member Invite Links</h1>
                    <p className="mt-2 text-sm text-slate-300">Create a private registration link for a potential member. Sent invites are tracked below.</p>
                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <input name="firstName" value={form.firstName} onChange={onChange} placeholder="First name" className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm" required />
                            <input name="lastName" value={form.lastName} onChange={onChange} placeholder="Last name" className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm" required />
                            <input name="phoneNumber" value={form.phoneNumber} onChange={onChange} inputMode="numeric" pattern="\d{10}" placeholder="10 digit phone" className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm" required />
                            <input type="email" name="email" value={form.email} onChange={onChange} placeholder="Email address" className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm" required />
                        </div>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <button type="submit" disabled={submitting} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">{submitting ? "Creating link..." : "Create Invite Link"}</button>
                    </form>

                    {inviteLink && <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3"><p className="text-sm text-emerald-100">Send this private link to the potential member:</p><a href={inviteLink} className="block break-all text-sm underline text-emerald-200" target="_blank" rel="noreferrer">{inviteLink}</a><button type="button" className="rounded-md border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10" onClick={copyInviteLink}>Copy link</button>{copyMessage && <p className="text-xs text-slate-200">{copyMessage}</p>}{emailStatusMessage && <p className="text-xs text-emerald-200">{emailStatusMessage}</p>}{emailLink && <a href={emailLink} className="block text-sm underline text-emerald-200">Compose email</a>}{smsLink && <a href={smsLink} className="block text-sm underline text-emerald-200">Compose text message</a>}</div>}
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold">Sent Invite History</h2><p className="mt-1 text-sm text-slate-300">See who was invited, whether the email was opened, and whether registration was completed.</p></div><button type="button" onClick={loadInviteHistory} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Refresh</button></div>
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-sm">
                            <thead><tr className="border-b border-white/15 text-left text-slate-300"><th className="px-3 py-3">Invitee</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Invited By</th><th className="px-3 py-3">Sent</th><th className="px-3 py-3">Email Opened</th><th className="px-3 py-3">Registration Completed</th><th className="px-3 py-3">Status</th></tr></thead>
                            <tbody>{invites.map((invite) => {
                                const status = invite.registration_completed_at ? "Registered" : invite.email_opened_at ? "Opened" : invite.email_sent_at ? "Sent" : "Created";
                                return <tr key={invite.id} className="border-b border-white/10"><td className="px-3 py-3 font-medium">{invite.first_name} {invite.last_name}</td><td className="px-3 py-3">{invite.email}</td><td className="px-3 py-3">{invite.invited_by_username}</td><td className="px-3 py-3">{dateTime(invite.email_sent_at)}</td><td className="px-3 py-3">{dateTime(invite.email_opened_at)}</td><td className="px-3 py-3">{dateTime(invite.registration_completed_at)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Registered" ? "bg-emerald-500/20 text-emerald-200" : status === "Opened" ? "bg-blue-500/20 text-blue-200" : "bg-amber-500/20 text-amber-200"}`}>{status}</span></td></tr>;
                            })}</tbody>
                        </table>
                        {!loadingInvites && invites.length === 0 && <p className="py-8 text-center text-slate-400">No tracked invites yet. New invites will appear here.</p>}
                        {loadingInvites && <p className="py-8 text-center text-slate-400">Loading invite history...</p>}
                    </div>
                    <p className="mt-4 text-xs text-slate-400">Email-open tracking is best-effort. Some email providers block images or pre-load them, so an open time may be unavailable or may represent an email provider preview rather than the recipient personally opening the message.</p>
                </section>
            </div>
        </main>
    );
}
