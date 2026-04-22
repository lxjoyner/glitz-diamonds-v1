"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type AuthUser = {
    id: string;
    username: string;
    role: string;
};

type MessageItem = {
    id: number;
    created_at: string;
    name: string;
    email: string;
    message: string;
    ip_address?: string | null;
};

type GalleryItem = {
    id: number;
    caption: string;
    imageUrl: string;
    createdAt: string;
};

type SiteUser = {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string | null;
    is_active: number;
    created_at: string;
};

type DonationRecord = {
    id: number;
    donor_name: string | null;
    donor_email: string | null;
    message: string | null;
    amount_cents: number;
    payment_status?: string;
    created_at: string;
};

type DashboardSettings = {
    timezone: string;
    date_format: string;
    time_format: string;
};

const DATE_FORMAT_OPTIONS = ["MMM d, yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];
const TIME_FORMAT_OPTIONS = ["h:mm a", "HH:mm", "h:mm:ss a"];
const FALLBACK_TIMEZONE_OPTIONS = [
    "America/Chicago",
    "America/New_York",
    "America/Los_Angeles",
    "America/Denver",
    "UTC",
];

function getTimezoneOptions() {
    const intlWithSupportedValues = Intl as typeof Intl & {
        supportedValuesOf?: (key: "timeZone") => string[];
    };

    if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
        return intlWithSupportedValues.supportedValuesOf("timeZone");
    }

    return FALLBACK_TIMEZONE_OPTIONS;
}

function toDisplayName(username: string) {
    if (!username) return "Unknown User";

    const normalized = username
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) return "Unknown User";

    return normalized
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function toIntlOptions(dateFormat: string, timeFormat: string): Intl.DateTimeFormatOptions {
    const dateOptions: Record<string, Intl.DateTimeFormatOptions> = {
        "MMM d, yyyy": { month: "short", day: "numeric", year: "numeric" },
        "MM/dd/yyyy": { month: "2-digit", day: "2-digit", year: "numeric" },
        "yyyy-MM-dd": { year: "numeric", month: "2-digit", day: "2-digit" },
    };

    const timeOptions: Record<string, Intl.DateTimeFormatOptions> = {
        "h:mm a": { hour: "numeric", minute: "2-digit", hour12: true },
        "HH:mm": { hour: "2-digit", minute: "2-digit", hour12: false },
        "h:mm:ss a": { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true },
    };

    return {
        ...(dateOptions[dateFormat] || dateOptions["MMM d, yyyy"]),
        ...(timeOptions[timeFormat] || timeOptions["h:mm a"]),
    };
}

export default function AdminMessagesPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
    const [siteUsers, setSiteUsers] = useState<SiteUser[]>([]);
    const [donations, setDonations] = useState<DonationRecord[]>([]);
    const [galleryCaption, setGalleryCaption] = useState("");
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [galleryError, setGalleryError] = useState("");
    const [gallerySuccess, setGallerySuccess] = useState("");
    const [settings, setSettings] = useState<DashboardSettings>({
        timezone: "America/Chicago",
        date_format: "MMM d, yyyy",
        time_format: "h:mm a",
    });
    const [settingsMessage, setSettingsMessage] = useState("");
    const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
    const userDisplayName = useMemo(() => toDisplayName(user?.username || ""), [user?.username]);

    const canManageUsers = user?.role === "admin";
    const canManageGallery = user?.role === "admin" || user?.role === "secretary";
    const canViewMessages = user?.role === "admin" || user?.role === "secretary";
    const canViewDonations = user?.role === "admin" || user?.role === "treasurer";

    const formatter = useMemo(
        () =>
            new Intl.DateTimeFormat(
                "en-US",
                {
                    ...toIntlOptions(settings.date_format, settings.time_format),
                    timeZone: settings.timezone,
                }
            ),
        [settings.date_format, settings.time_format, settings.timezone]
    );

    function formatDate(value: string) {
        const parsedDate = new Date(value);
        return Number.isNaN(parsedDate.getTime()) ? "Unknown date" : formatter.format(parsedDate);
    }

    const loadMe = useCallback(async () => {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (meData?.authenticated) {
            setUser(meData.user);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        if (!canManageUsers) return;
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json();
        if (data?.success && data.settings) {
            setSettings(data.settings);
        }
    }, [canManageUsers]);

    const loadGallery = useCallback(async () => {
        if (!canManageGallery) return;
        const galleryRes = await fetch("/api/admin/gallery", { cache: "no-store" });
        const galleryData = await galleryRes.json();

        if (galleryData?.success) {
            setGalleryItems(galleryData.images || []);
        }
    }, [canManageGallery]);

    const loadMessages = useCallback(async () => {
        if (!canViewMessages) return;
        const res = await fetch("/api/admin/messages", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setMessages(data.messages || []);
    }, [canViewMessages]);

    const loadUsers = useCallback(async () => {
        if (!canManageUsers) return;
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setSiteUsers(data.users || []);
    }, [canManageUsers]);

    const loadDonations = useCallback(async () => {
        if (!canViewDonations) return;
        const res = await fetch("/api/admin/donations", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setDonations(data.donations || []);
    }, [canViewDonations]);

    useEffect(() => {
        async function init() {
            await loadMe();
        }

        init();
    }, [loadMe]);

    useEffect(() => {
        if (!user) return;
        loadSettings();
        loadMessages();
        loadGallery();
        loadUsers();
        loadDonations();
    }, [user, loadSettings, loadMessages, loadGallery, loadUsers, loadDonations]);

    const handleLogout = async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    };

    const handleSaveSettings = async () => {
        setSettingsMessage("");
        const response = await fetch("/api/admin/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                timezone: settings.timezone,
                dateFormat: settings.date_format,
                timeFormat: settings.time_format,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            setSettingsMessage(data?.error || "Failed to save settings.");
            return;
        }

        setSettings(data.settings);
        setSettingsMessage("Settings saved.");
    };

    const handleSyncStripeDonations = async () => {
        const response = await fetch("/api/admin/donations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "stripe", limit: 50 }),
        });
        const data = await response.json();
        if (data?.success) {
            setDonations(data.donations || []);
        }
    };

    const handleAddManualDonation = async () => {
        const amount = window.prompt("Donation amount in dollars (example 25.00):");
        if (!amount) return;
        const donorName = window.prompt("Donor name (optional):") || "";
        const donorEmail = window.prompt("Donor email (optional):") || "";
        const message = window.prompt("Message (optional):") || "";

        const response = await fetch("/api/admin/donations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "manual",
                amountCents: Math.round(Number(amount) * 100),
                donorName,
                donorEmail,
                message,
            }),
        });

        const data = await response.json();
        if (data?.success) {
            setDonations(data.donations || []);
        }
    };

    const handleUploadGalleryImage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!galleryFile) {
            setGalleryError("Please select an image file.");
            return;
        }

        setGalleryError("");
        setGallerySuccess("");
        setIsUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append("caption", galleryCaption.trim());
            formData.append("file", galleryFile);
            formData.append("isActive", "true");

            const response = await fetch("/api/admin/gallery", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Failed to upload image.");
            }

            setGalleryCaption("");
            setGalleryFile(null);
            setGallerySuccess("Image uploaded successfully.");
            await loadGallery();
        } catch (error) {
            setGalleryError(error instanceof Error ? error.message : "Failed to upload image.");
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleDeleteGalleryImage = async (imageId: number) => {
        setGalleryError("");
        setGallerySuccess("");

        try {
            const response = await fetch(`/api/admin/gallery?id=${imageId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Failed to delete image.");
            }

            setGallerySuccess("Gallery image removed.");
            await loadGallery();
        } catch (error) {
            setGalleryError(error instanceof Error ? error.message : "Failed to delete image.");
        }
    };

    const handleRoleChange = async (siteUserId: number, role: string) => {
        const response = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: siteUserId, role }),
        });

        if (response.ok) {
            await loadUsers();
        }
    };

    return (
        <main className="min-h-screen bg-black text-white px-6 py-10">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold">Role Dashboard</h1>
                        <p className="text-sm text-slate-300">Signed in as {user?.username || "..."} ({user?.role || "..."})</p>
                    </div>

                    <div className="relative group">
                        <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-base transition hover:bg-white/10"
                            aria-label="User menu"
                        >
                            👤
                        </button>
                        <div className="pointer-events-none absolute right-0 top-12 w-56 rounded-lg border border-white/15 bg-black/90 p-3 opacity-0 shadow-lg transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                            <p className="text-sm font-medium text-white">{userDisplayName}</p>
                            <p className="text-xs text-slate-300">{user?.role || "Unknown role"}</p>
                            <button
                                onClick={handleLogout}
                                className="mt-3 w-full rounded-md bg-red-800 px-3 py-2 text-sm font-medium hover:bg-red-500"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {canManageUsers && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-2xl font-semibold">Dashboard Date/Time Settings</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <select
                                value={settings.timezone}
                                onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))}
                                className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            >
                                {timezoneOptions.map((timezoneOption) => (
                                    <option key={timezoneOption} value={timezoneOption}>
                                        {timezoneOption}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={settings.date_format}
                                onChange={(event) => setSettings((prev) => ({ ...prev, date_format: event.target.value }))}
                                className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            >
                                {DATE_FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <select
                                value={settings.time_format}
                                onChange={(event) => setSettings((prev) => ({ ...prev, time_format: event.target.value }))}
                                className="rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            >
                                {TIME_FORMAT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <button onClick={handleSaveSettings} className="rounded-lg bg-red-800 px-4 py-2 text-sm hover:bg-red-500">Save settings</button>
                            <p className="text-xs text-slate-300">Preview: {formatDate(new Date().toISOString())}</p>
                        </div>
                        {settingsMessage && <p className="mt-2 text-sm text-slate-300">{settingsMessage}</p>}
                    </section>
                )}

                {canManageUsers && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <h2 className="text-2xl font-semibold">Member Role Manager</h2>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href="/admin/membership"
                                    className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                                >
                                    Open membership page
                                </Link>
                                <Link
                                    href="/admin/ideas-activities"
                                    className="rounded-lg border border-fuchsia-300/40 px-3 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-500/20"
                                >
                                    Ideas & Activities
                                </Link>
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">Admin can change or remove member roles.</p>
                        <div className="mt-4 space-y-3">
                            {siteUsers.map((siteUser) => (
                                <div key={siteUser.id} className="rounded-lg border border-white/10 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{siteUser.full_name} ({siteUser.username})</p>
                                        <p className="text-sm text-slate-300">{siteUser.email}</p>
                                    </div>
                                    <select
                                        className="rounded bg-black border border-white/20 px-3 py-2 text-sm"
                                        value={siteUser.role || ""}
                                        onChange={(event) => handleRoleChange(siteUser.id, event.target.value)}
                                    >
                                        <option value="">No role</option>
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                        <option value="secretary">Secretary</option>
                                        <option value="treasurer">Treasurer</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {canManageGallery && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-2xl font-semibold">Gallery Manager</h2>
                        <form onSubmit={handleUploadGalleryImage} className="mt-5 grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
                            <input type="text" value={galleryCaption} onChange={(event) => setGalleryCaption(event.target.value)} className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm" placeholder="Caption" maxLength={255} required />
                            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => setGalleryFile(event.target.files?.[0] ?? null)} className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm" required />
                            <button type="submit" disabled={isUploadingImage} className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-500 transition disabled:opacity-60">{isUploadingImage ? "Uploading..." : "Upload"}</button>
                        </form>
                        {gallerySuccess && <p className="mt-3 text-sm text-emerald-400">{gallerySuccess}</p>}
                        {galleryError && <p className="mt-3 text-sm text-red-400">{galleryError}</p>}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {galleryItems.map((item) => (
                                <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                                    <div className="relative h-40 overflow-hidden rounded-lg border border-white/10">
                                        <Image src={item.imageUrl} alt={item.caption} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" unoptimized />
                                    </div>
                                    <p className="mt-3 text-sm font-medium">{item.caption}</p>
                                    <button type="button" onClick={() => handleDeleteGalleryImage(item.id)} className="mt-3 rounded-md border border-red-400/40 bg-red-900/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-900/50">Delete</button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {canViewMessages && (
                    <section>
                        <h2 className="mb-4 text-2xl font-semibold">Contact Messages</h2>
                        <div className="space-y-4">
                            {messages.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <p className="text-lg font-medium">{item.name}</p>
                                            <p className="text-sm text-slate-300">{item.email}</p>
                                        </div>
                                        <p className="text-sm text-slate-400">{formatDate(item.created_at)}</p>
                                    </div>
                                    <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-4">
                                        <p className="whitespace-pre-wrap text-slate-200">{item.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {canViewDonations && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-2xl font-semibold">Donations</h2>
                            <div className="flex gap-2">
                                <button onClick={handleSyncStripeDonations} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Sync Stripe</button>
                                <button onClick={handleAddManualDonation} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Add manual</button>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            {donations.map((record) => (
                                <div key={record.id} className="rounded-lg border border-white/10 p-3">
                                    <p className="font-medium">${(record.amount_cents / 100).toFixed(2)} - {record.donor_name || "Anonymous"}</p>
                                    <p className="text-sm text-slate-300">{record.donor_email || "No email"}</p>
                                    <p className="text-xs text-slate-400">{formatDate(record.created_at)} ({record.payment_status || "pending"})</p>
                                </div>
                            ))}
                            {donations.length === 0 && <p className="text-sm text-slate-400">No donations recorded yet.</p>}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
