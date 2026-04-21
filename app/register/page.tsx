"use client";

import { useState } from "react";

export default function RegisterPage() {
    const [form, setForm] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Registration failed.");
            }

            setSuccess(data?.message || "Registered successfully.");
            setForm({ fullName: "", username: "", email: "", password: "" });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white px-4 py-12">
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-3xl font-semibold">Member Registration</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Register as a Member to access member features and change your password.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Full Name</label>
                        <input
                            name="fullName"
                            value={form.fullName}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Username</label>
                        <input
                            name="username"
                            value={form.username}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Password</label>
                        <input
                            type="password"
                            name="password"
                            minLength={12}
                            value={form.password}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-60"
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                {success && <p className="mt-4 text-sm text-emerald-400">{success}</p>}
                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
        </main>
    );
}
