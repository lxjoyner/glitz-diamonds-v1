"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        username: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            console.log("login response:", data);

            if (!res.ok) {
                throw new Error(data?.error || "Login failed.");
            }

            router.push("/admin/messages");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">
                            Username
                        </label>
                        <input
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">
                            Password
                        </label>
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
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                    {error && <p className="text-sm text-red-400">{error}</p>}
                </form>
            </div>
        </main>
    );
}