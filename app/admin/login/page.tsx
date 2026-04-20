"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginForm = {
    username: string;
    password: string;
};

type ChangePasswordForm = {
    username: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
};

export default function AdminLoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "change-password">("login");

    const [loginForm, setLoginForm] = useState<LoginForm>({
        username: "",
        password: "",
    });

    const [changeForm, setChangeForm] = useState<ChangePasswordForm>({
        username: "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleChangePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setChangeForm((prev) => ({ ...prev, [name]: value }));
    };

    const resetStatusMessages = () => {
        setError("");
        setSuccess("");
    };

    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        resetStatusMessages();

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(loginForm),
            });

            const data = await res.json();

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

    const handleChangePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        resetStatusMessages();

        if (changeForm.newPassword !== changeForm.confirmNewPassword) {
            setError("New password and confirmation do not match.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/admin/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: changeForm.username,
                    currentPassword: changeForm.currentPassword,
                    newPassword: changeForm.newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to change password.");
            }

            setSuccess("Password updated successfully. You can now sign in with your new password.");
            setChangeForm({
                username: changeForm.username,
                currentPassword: "",
                newPassword: "",
                confirmNewPassword: "",
            });
            setMode("login");
            setLoginForm((prev) => ({ ...prev, username: changeForm.username, password: "" }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to change password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-2xl font-semibold mb-4">Admin Access</h1>

                <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/15 p-1">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("login");
                            resetStatusMessages();
                        }}
                        className={`rounded-md px-3 py-2 text-sm transition ${
                            mode === "login" ? "bg-red-700 text-white" : "text-slate-300 hover:bg-white/10"
                        }`}
                    >
                        Sign In
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setMode("change-password");
                            resetStatusMessages();
                        }}
                        className={`rounded-md px-3 py-2 text-sm transition ${
                            mode === "change-password"
                                ? "bg-red-700 text-white"
                                : "text-slate-300 hover:bg-white/10"
                        }`}
                    >
                        Change Password
                    </button>
                </div>

                {mode === "login" ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Username</label>
                            <input
                                name="username"
                                value={loginForm.username}
                                onChange={handleLoginChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Password</label>
                            <input
                                name="password"
                                type="password"
                                value={loginForm.password}
                                onChange={handleLoginChange}
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

                        <p className="text-sm">
                            <Link href="/admin/reset-password" className="text-red-300 hover:text-red-200 underline">
                                Forgot password?
                            </Link>
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Username</label>
                            <input
                                name="username"
                                value={changeForm.username}
                                onChange={handleChangePasswordChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Current Password</label>
                            <input
                                name="currentPassword"
                                type="password"
                                value={changeForm.currentPassword}
                                onChange={handleChangePasswordChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">New Password</label>
                            <input
                                name="newPassword"
                                type="password"
                                minLength={12}
                                value={changeForm.newPassword}
                                onChange={handleChangePasswordChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                            <p className="mt-1 text-xs text-slate-400">Must be at least 12 characters.</p>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Confirm New Password</label>
                            <input
                                name="confirmNewPassword"
                                type="password"
                                minLength={12}
                                value={changeForm.confirmNewPassword}
                                onChange={handleChangePasswordChange}
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition disabled:opacity-60"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}

                {success && <p className="mt-4 text-sm text-emerald-400">{success}</p>}
                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
        </main>
    );
}
