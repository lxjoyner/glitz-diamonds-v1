"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MessageItem = {
    id: string;
    createdAt: string;
    name: string;
    email: string;
    message: string;
    ip?: string;
};

export default function AdminMessagesPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<MessageItem[]>([]);

    useEffect(() => {
        async function loadMessages() {
            const res = await fetch("/api/admin/messages");
            const data = await res.json();

            if (data?.success) {
                setMessages(data.messages || []);
            }
        }

        loadMessages();
    }, []);

    const handleLogout = async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    };

    return (
        <main className="min-h-screen bg-black text-white px-6 py-10">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">Contact Messages</h1>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-500 transition"
                    >
                        Logout
                    </button>
                </div>

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
                                        {new Date(item.createdAt).toLocaleString()}
                                    </p>
                                </div>

                                <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-4">
                                    <p className="whitespace-pre-wrap text-slate-200">
                                        {item.message}
                                    </p>
                                </div>

                                {item.ip && (
                                    <p className="mt-3 text-xs text-slate-500">IP: {item.ip}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}