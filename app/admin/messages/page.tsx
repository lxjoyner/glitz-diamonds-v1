"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

function formatMessageDate(value: string) {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime())
        ? "Unknown date"
        : parsedDate.toLocaleString();
}

export default function AdminMessagesPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
    const [galleryCaption, setGalleryCaption] = useState("");
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [galleryError, setGalleryError] = useState("");
    const [gallerySuccess, setGallerySuccess] = useState("");

    const loadGallery = async () => {
        const galleryRes = await fetch("/api/admin/gallery", { cache: "no-store" });
        const galleryData = await galleryRes.json();

        if (galleryData?.success) {
            setGalleryItems(galleryData.images || []);
        }
    };

    useEffect(() => {
        async function loadData() {
            const res = await fetch("/api/admin/messages");
            const data = await res.json();

            if (data?.success) {
                setMessages(data.messages || []);
            }

            await loadGallery();
        }

        loadData();
    }, []);

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
            setGallerySuccess("Image uploaded successfully and added to the hero scrolling gallery.");
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

    return (
        <main className="min-h-screen bg-black text-white px-6 py-10">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">Admin Dashboard</h1>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-500 transition"
                    >
                        Logout
                    </button>
                </div>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h2 className="text-2xl font-semibold">Hero Gallery Manager</h2>
                    <p className="mt-2 text-sm text-slate-300">
                        Upload images here to add them to the home page scrolling gallery. Files are stored in the database.
                    </p>

                    <form onSubmit={handleUploadGalleryImage} className="mt-5 grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
                        <div>
                            <label className="mb-1 block text-sm text-slate-300">Caption</label>
                            <input
                                type="text"
                                value={galleryCaption}
                                onChange={(event) => setGalleryCaption(event.target.value)}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="Example: Back-to-School Donation Drive"
                                maxLength={255}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-slate-300">Image File</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={(event) => setGalleryFile(event.target.files?.[0] ?? null)}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-red-900/80 file:px-3 file:py-1.5 file:text-white"
                                required
                            />
                            <p className="mt-1 text-xs text-slate-400">Max size: 16MB</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isUploadingImage}
                            className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-500 transition disabled:opacity-60"
                        >
                            {isUploadingImage ? "Uploading..." : "Upload Image"}
                        </button>
                    </form>

                    {gallerySuccess && <p className="mt-3 text-sm text-emerald-400">{gallerySuccess}</p>}
                    {galleryError && <p className="mt-3 text-sm text-red-400">{galleryError}</p>}

                    <div className="mt-6">
                        <h3 className="text-lg font-medium">Current Gallery Images</h3>

                        {galleryItems.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-400">No gallery images uploaded yet.</p>
                        ) : (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {galleryItems.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                                        <div className="relative h-40 overflow-hidden rounded-lg border border-white/10">
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.caption}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                className="object-cover"
                                                unoptimized
                                            />
                                        </div>

                                        <p className="mt-3 text-sm font-medium">{item.caption}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {formatMessageDate(item.createdAt)}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteGalleryImage(item.id)}
                                            className="mt-3 rounded-md border border-red-400/40 bg-red-900/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-900/50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="mb-4 text-2xl font-semibold">Contact Messages</h2>

                    {messages.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                            No messages yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div>
                                            <p className="text-lg font-medium">{item.name}</p>
                                            <p className="text-sm text-slate-300">{item.email}</p>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {formatMessageDate(item.created_at)}
                                        </p>
                                    </div>

                                    <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-4">
                                        <p className="whitespace-pre-wrap text-slate-200">
                                            {item.message}
                                        </p>
                                    </div>

                                    {item.ip_address && (
                                        <p className="mt-3 text-xs text-slate-500">
                                            IP: {item.ip_address}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
