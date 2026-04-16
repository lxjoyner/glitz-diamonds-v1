"use client";

import { useState } from "react";

export default function ContactPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        message: "",
        company: "", // honeypot
    });

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setStatus("");
        setError("");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to send message.");
            }

            setStatus("Message sent successfully!");
            setForm({
                name: "",
                email: "",
                message: "",
                company: "",
            });
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Error sending message."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-64px)] bg-black/60 border-t border-white/10">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <h1 className="text-3xl md:text-4xl font-semibold mb-6">
                    Contact
                </h1>

                <p className="text-lg text-slate-200 max-w-2xl mb-6">
                    Have a question about Glitz Of Diamonds, our events, or how to
                    get involved? Send us a message and we’ll get back to you.
                </p>

                <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
                    <div className="hidden" aria-hidden="true">
                        <label htmlFor="company">Company</label>
                        <input
                            id="company"
                            name="company"
                            type="text"
                            value={form.company}
                            onChange={handleChange}
                            tabIndex={-1}
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="name"
                            className="block text-md text-slate-200 mb-1"
                        >
                            Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-md text-slate-200 mb-1"
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="message"
                            className="block text-md text-slate-200 mb-1"
                        >
                            Message
                        </label>
                        <textarea
                            id="message"
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="How can we help you?"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sending..." : "Send Message"}
                    </button>

                    {status && (
                        <p className="text-sm text-green-400">{status}</p>
                    )}

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}
                </form>

                <div className="mt-10 border-t border-white/10 pt-6">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                        By Phone
                    </h2>
                    <p className="text-lg text-slate-300 max-w-2xl">
                        Call the founder at <span className="font-semibold">817-689-8674</span>
                    </p>
                </div>
            </div>
        </main>
    );
}