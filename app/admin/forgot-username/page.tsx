"use client";

import Link from "next/link";
import { useState } from "react";

type ForgotUsernameForm = {
    email: string;
    password: string;
};

export default function ForgotUsernamePage() {
    const [form, setForm] = useState<ForgotUsernameForm>({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            const res = await fetch("/api/admin/forgot-username", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to recover username.");
            }

            setMessage(data.message || "If the account details are valid, your username has been sent to your email.");
            setForm((prev) => ({ ...prev, password: "" }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to recover username.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-2xl font-semibold mb-4">Forgot Username</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-slate-300">
                        Enter your account email and password. If they match, your username will be emailed to you.
                    </p>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Password</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition disabled:opacity-60"
                    >
                        {loading ? "Sending..." : "Send Username"}
                    </button>

                    <p className="text-sm">
                        <Link href="/admin/reset-password" className="text-red-300 hover:text-red-200 underline">
                            Forgot Your Password?
                        </Link>
                    </p>
                </form>

                {message && <p className="text-sm text-green-400 mt-4">{message}</p>}
                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
            </div>
        </main>
    );
}
