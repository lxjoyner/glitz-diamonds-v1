"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const requestReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch("/api/admin/request-password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to request reset link.");
            }

            setMessage(data.message || "Reset email sent.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to request reset link.");
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch("/api/admin/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to reset password.");
            }

            setMessage("Password reset successful. You can now sign in with your new password.");
            setPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-2xl font-semibold mb-4">Admin Password Reset</h1>

                {!token ? (
                    <form onSubmit={requestReset} className="space-y-4">
                        <p className="text-sm text-slate-300">
                            Enter your admin username or email and we&apos;ll send a reset link.
                        </p>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Username</label>
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition disabled:opacity-60"
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={resetPassword} className="space-y-4">
                        <p className="text-sm text-slate-300">
                            Enter your new admin password (minimum 12 characters).
                        </p>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition disabled:opacity-60"
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                {message && <p className="text-sm text-green-400 mt-4">{message}</p>}
                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
            </div>
        </main>
    );
}
