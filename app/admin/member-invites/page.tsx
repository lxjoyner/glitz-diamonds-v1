"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = {
    id: string;
    username: string;
    role: string;
};

export default function MemberInvitesPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [smsLink, setSmsLink] = useState("");
    const [emailLink, setEmailLink] = useState("");
    const [copyMessage, setCopyMessage] = useState("");

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

        if (name === "phoneNumber") {
            value = value.replace(/\D/g, "").slice(0, 10);
        }

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

        try {
            const res = await fetch("/api/admin/member-invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Failed to create invite link.");
            }

            setInviteLink(data.inviteLink || "");
            setSmsLink(data.smsLink || "");
            setEmailLink(data.emailLink || "");
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Failed to create invite link.");
        } finally {
            setSubmitting(false);
        }
    };

    const copyInviteLink = async () => {
        if (!inviteLink) return;

        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(inviteLink);
            } else if (typeof document !== "undefined") {
                const textarea = document.createElement("textarea");
                textarea.value = inviteLink;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const didCopy = document.execCommand("copy");
                document.body.removeChild(textarea);

                if (!didCopy) {
                    throw new Error("Copy command failed.");
                }
            } else {
                throw new Error("Clipboard is not available.");
            }

            setCopyMessage("Link copied to clipboard.");
        } catch {
            setCopyMessage("Could not copy automatically on this device. Please press and hold the link above to copy.");
        }
    };

    if (loadingAuth) {
        return (
            <main className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">Loading...</div>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                    <h1 className="text-2xl font-semibold">Admin Access Required</h1>
                    <p className="mt-2 text-sm text-red-100">Only admins can create member registration invite links.</p>
                    <Link href="/admin/messages" className="mt-4 inline-flex text-sm underline">
                        Return to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white px-4 py-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-3xl font-semibold">Member Invite Links</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Create a private registration link for a potential member. They must use this link to access registration.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm text-slate-300">First Name</label>
                            <input
                                name="firstName"
                                value={form.firstName}
                                onChange={onChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-slate-300">Last Name</label>
                            <input
                                name="lastName"
                                value={form.lastName}
                                onChange={onChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm text-slate-300">Phone Number</label>
                            <input
                                name="phoneNumber"
                                value={form.phoneNumber}
                                onChange={onChange}
                                inputMode="numeric"
                                pattern="\d{10}"
                                placeholder="10 digits"
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-slate-300">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={onChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {submitting ? "Creating link..." : "Create Invite Link"}
                    </button>
                </form>

                {inviteLink && (
                    <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                        <p className="text-sm text-emerald-100">Send this private link to the potential member:</p>
                        <a href={inviteLink} className="block break-all text-sm underline text-emerald-200" target="_blank" rel="noreferrer">
                            {inviteLink}
                        </a>
                        <button
                            type="button"
                            className="rounded-md border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10"
                            onClick={copyInviteLink}
                        >
                            Copy link
                        </button>
                        {copyMessage && <p className="text-xs text-slate-200">{copyMessage}</p>}


                        {emailLink && (
                            <div className="pt-2">
                                <p className="text-xs text-slate-200">Optional: open your email app with the requested message:</p>
                                <a href={emailLink} className="text-sm underline text-emerald-200">
                                    Compose email
                                </a>
                            </div>
                        )}

                        {smsLink && (
                            <div className="pt-2">
                                <p className="text-xs text-slate-200">Optional: open your SMS app with a pre-filled message:</p>
                                <a href={smsLink} className="text-sm underline text-emerald-200">
                                    Compose text message
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
