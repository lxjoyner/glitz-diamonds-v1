"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    created_at: string;
};

function formatDate(value: string) {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? "Unknown date" : parsedDate.toLocaleString();
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

    const canManageUsers = user?.role === "admin";
    const canManageGallery = user?.role === "admin" || user?.role === "secretary";
    const canViewMessages = user?.role === "admin" || user?.role === "secretary";
    const canViewDonations = user?.role === "admin" || user?.role === "treasurer";

    const loadMe = async () => {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (meData?.authenticated) {
            setUser(meData.user);
        }
    };

    const loadGallery = async () => {
        if (!canManageGallery) return;
        const galleryRes = await fetch("/api/admin/gallery", { cache: "no-store" });
        const galleryData = await galleryRes.json();

        if (galleryData?.success) {
            setGalleryItems(galleryData.images || []);
        }
    };

    const loadMessages = async () => {
        if (!canViewMessages) return;
        const res = await fetch("/api/admin/messages");
        const data = await res.json();
        if (data?.success) setMessages(data.messages || []);
    };

    const loadUsers = async () => {
        if (!canManageUsers) return;
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setSiteUsers(data.users || []);
    };

    const loadDonations = async () => {
        if (!canViewDonations) return;
        const res = await fetch("/api/admin/donations", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) setDonations(data.donations || []);
    };

    useEffect(() => {
        async function init() {
            await loadMe();
        }

        init();
    }, []);

    useEffect(() => {
        if (!user) return;
        loadMessages();
        loadGallery();
        loadUsers();
        loadDonations();
    }, [user?.role]);

    const handleLogout = async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
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

                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-500 transition"
                    >
                        Logout
                    </button>
                </div>

                {canManageUsers && (
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <h2 className="text-2xl font-semibold">Member Role Manager</h2>
                            <Link
                                href="/admin/membership"
                                className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                            >
                                Open membership page
                            </Link>
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
                        <h2 className="text-2xl font-semibold">Donations</h2>
                        <div className="mt-4 space-y-3">
                            {donations.map((record) => (
                                <div key={record.id} className="rounded-lg border border-white/10 p-3">
                                    <p className="font-medium">${(record.amount_cents / 100).toFixed(2)} - {record.donor_name || "Anonymous"}</p>
                                    <p className="text-sm text-slate-300">{record.donor_email || "No email"}</p>
                                    <p className="text-xs text-slate-400">{formatDate(record.created_at)}</p>
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
