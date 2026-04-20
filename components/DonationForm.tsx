"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const PRESET_AMOUNTS = [15, 25, 50, 100];

export default function DonationForm() {
    const searchParams = useSearchParams();
    const status = searchParams.get("status");

    const [amount, setAmount] = useState(25);
    const [donorName, setDonorName] = useState("");
    const [donorEmail, setDonorEmail] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const statusMessage = useMemo(() => {
        if (status === "success") {
            return {
                tone: "success",
                text: "Thank you for your donation! Your support helps Glitz Of Diamonds continue serving the community.",
            };
        }

        if (status === "cancelled") {
            return {
                tone: "warning",
                text: "Donation checkout was cancelled. You can try again whenever you're ready.",
            };
        }

        return null;
    }, [status]);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/donations/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ amount, donorName, donorEmail, message }),
            });

            const data = (await response.json()) as {
                checkoutUrl?: string;
                error?: string;
            };

            if (!response.ok || !data.checkoutUrl) {
                setError(data.error ?? "Unable to start Stripe checkout right now.");
                return;
            }

            window.location.assign(data.checkoutUrl);
        } catch (submitError) {
            console.error("Donation submit failed:", submitError);
            setError("Network error while contacting checkout.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="min-h-[calc(100vh-64px)] border-t border-white/10 bg-black/40">
            <div className="container mx-auto px-4 py-10 md:py-16">
                <div className="mx-auto max-w-2xl rounded-2xl border border-white/15 bg-black/50 p-6 md:p-8 shadow-2xl">
                    <h1 className="text-3xl font-semibold">Support Glitz Of Diamonds</h1>
                    <p className="mt-3 text-slate-300">
                        Your donation helps fund events, outreach programs, and support for women and families in need.
                    </p>

                    {statusMessage && (
                        <p
                            className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
                                statusMessage.tone === "success"
                                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                            }`}
                        >
                            {statusMessage.text}
                        </p>
                    )}

                    <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                        <div>
                            <p className="text-sm font-medium text-slate-200">Choose donation amount</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {PRESET_AMOUNTS.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                                            amount === value
                                                ? "border-white/70 bg-white/20 text-white"
                                                : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                                        }`}
                                        onClick={() => setAmount(value)}
                                    >
                                        ${value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="donation-amount" className="text-sm font-medium text-slate-200">
                                Custom amount (USD)
                            </label>
                            <input
                                id="donation-amount"
                                name="amount"
                                type="number"
                                min={1}
                                max={1000}
                                step={1}
                                value={amount}
                                onChange={(event) => setAmount(Number(event.target.value))}
                                className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-white outline-none focus:border-white/50"
                                required
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="donor-name" className="text-sm font-medium text-slate-200">
                                    Name (optional)
                                </label>
                                <input
                                    id="donor-name"
                                    name="donorName"
                                    type="text"
                                    value={donorName}
                                    onChange={(event) => setDonorName(event.target.value)}
                                    className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-white outline-none focus:border-white/50"
                                />
                            </div>

                            <div>
                                <label htmlFor="donor-email" className="text-sm font-medium text-slate-200">
                                    Email (optional)
                                </label>
                                <input
                                    id="donor-email"
                                    name="donorEmail"
                                    type="email"
                                    value={donorEmail}
                                    onChange={(event) => setDonorEmail(event.target.value)}
                                    className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-white outline-none focus:border-white/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="donor-message" className="text-sm font-medium text-slate-200">
                                Message (optional)
                            </label>
                            <textarea
                                id="donor-message"
                                name="message"
                                rows={3}
                                maxLength={250}
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-white outline-none focus:border-white/50"
                            />
                        </div>

                        {error && (
                            <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full justify-center py-3 font-medium"
                            disabled={submitting}
                        >
                            {submitting ? "Redirecting to secure checkout..." : "Donate with Stripe"}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}
