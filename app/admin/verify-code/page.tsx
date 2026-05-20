"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export default function AdminVerifyCodePage() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [countdownMs, setCountdownMs] = useState(TEN_MINUTES_MS);

    useEffect(() => {
        const sentAtRaw = window.localStorage.getItem("glitz_admin_2fa_sent_at");
        const sentAt = sentAtRaw ? Number(sentAtRaw) : Date.now();
        const initialRemaining = Math.max(TEN_MINUTES_MS - (Date.now() - sentAt), 0);
        setCountdownMs(initialRemaining);

        const timerId = window.setInterval(() => {
            setCountdownMs((prev) => Math.max(prev - 1000, 0));
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    const formattedCountdown = `${String(Math.floor(countdownMs / 60000)).padStart(2, "0")}:${String(
        Math.floor((countdownMs % 60000) / 1000)
    ).padStart(2, "0")}`;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setInfo("");

        try {
            const res = await fetch("/api/admin/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Code verification failed.");
            }

            router.push("/");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Code verification failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResending(true);
        setError("");
        setInfo("");

        try {
            const res = await fetch("/api/admin/resend-verification-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to resend verification code.");
            }

            window.localStorage.setItem("glitz_admin_2fa_sent_at", String(Date.now()));
            setCountdownMs(TEN_MINUTES_MS);
            setInfo("A new verification code was sent to your email.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to resend verification code.");
        } finally {
            setResending(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-2xl font-semibold mb-2">Verify Login Code</h1>
                <p className="text-sm text-slate-300 mb-5">
                    Enter the 6-digit code sent to your registered email address.
                </p>
                <p className="text-sm text-slate-200 mb-5">
                    Code expires in <span className="font-semibold text-red-300">{formattedCountdown}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Verification Code</label>
                        <input
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="123456"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition disabled:opacity-60"
                    >
                        {loading ? "Verifying..." : "Verify Code"}
                    </button>
                </form>

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                {info && <p className="mt-4 text-sm text-green-400">{info}</p>}

                <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="mt-4 text-sm text-red-300 underline hover:text-red-200 disabled:opacity-60"
                >
                    {resending ? "Resending code..." : "Resend verification code"}
                </button>
            </div>
        </main>
    );
}
