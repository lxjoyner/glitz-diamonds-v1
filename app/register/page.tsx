"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const T_SHIRT_SIZES = ["XS", "SM", "M", "LG", "XL", "XXL", "XXXL", "XXXXL"] as const;
const JACKET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"] as const;
const GENDERS = ["Male", "Female"] as const;

type InviteData = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
};

export default function RegisterPage() {
    const searchParams = useSearchParams();
    const inviteToken = useMemo(() => searchParams.get("invite") || "", [searchParams]);

    const [inviteLoading, setInviteLoading] = useState(true);
    const [inviteError, setInviteError] = useState("");
    const [inviteData, setInviteData] = useState<InviteData | null>(null);

    const [form, setForm] = useState({
        firstName: "",
        middleInitial: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: "",
        tshirtSize: "M",
        favoriteColor: "",
        jacketSize: "",
        gender: "",
        birthday: "",
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        async function validateInvite() {
            if (!inviteToken) {
                setInviteError("This registration page requires a valid invite link.");
                setInviteLoading(false);
                return;
            }

            setInviteLoading(true);
            setInviteError("");

            try {
                const res = await fetch(`/api/register/invite/validate?invite=${encodeURIComponent(inviteToken)}`, {
                    cache: "no-store",
                });
                const data = await res.json();

                if (!res.ok || !data?.success) {
                    throw new Error(data?.error || "Invite link is invalid or expired.");
                }

                setInviteData(data.invite);
                setForm((prev) => ({
                    ...prev,
                    firstName: data.invite.firstName,
                    lastName: data.invite.lastName,
                    email: data.invite.email,
                }));
            } catch (inviteValidationError) {
                setInviteError(
                    inviteValidationError instanceof Error
                        ? inviteValidationError.message
                        : "Invite link is invalid or expired."
                );
            } finally {
                setInviteLoading(false);
            }
        }

        validateInvite();
    }, [inviteToken]);

    const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = event.target;
        let { value } = event.target;

        if (name === "zipCode") {
            value = value.replace(/\D/g, "").slice(0, 5);
        }

        if (name === "state") {
            value = value.toUpperCase().slice(0, 2);
        }

        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validatePasswordMatch = (value: string) => {
        const passwordsMatch = form.password === value;

        if (!passwordsMatch) {
            setError("Passwords do not match.");
        } else if (error === "Passwords do not match.") {
            setError("");
        }

        return passwordsMatch;
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (!inviteToken) {
                throw new Error("A valid invite token is required.");
            }

            if (form.middleInitial && form.middleInitial.trim().length < 3) {
                throw new Error("Middle initials must be at least 3 characters when provided.");
            }

            const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%&*]).{12,}$/;
            if (!passwordPolicy.test(form.password)) {
                throw new Error(
                    "Password must be at least 12 characters and include uppercase, lowercase, number, and one symbol: !@#$%&*."
                );
            }

            if (!/^\d{5}$/.test(form.zipCode)) {
                throw new Error("Zip code must be exactly 5 numbers.");
            }

            const birthdayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.birthday);
            if (!birthdayMatch) {
                throw new Error("Birthday is required.");
            }
            const birthdayDigits = `${birthdayMatch[2]}${birthdayMatch[3]}${birthdayMatch[1]}`;

            const fullName = [form.firstName, form.middleInitial, form.lastName].filter(Boolean).join(" ");
            const address = [form.streetAddress, form.city, form.state, form.zipCode].filter(Boolean).join(", ");

            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    birthday: birthdayDigits,
                    fullName,
                    address,
                    inviteToken,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Registration failed.");
            }

            setSuccess(data?.message || "Registered successfully.");
            setForm((prev) => ({
                ...prev,
                middleInitial: "",
                username: "",
                password: "",
                streetAddress: "",
                city: "",
                state: "",
                zipCode: "",
                tshirtSize: "M",
                favoriteColor: "",
                jacketSize: "",
                gender: "",
                birthday: "",
            }));
            setConfirmPassword("");
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    if (inviteLoading) {
        return (
            <main className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
                    <p className="text-sm text-slate-300">Validating your invite link...</p>
                </div>
            </main>
        );
    }

    if (inviteError || !inviteData) {
        return (
            <main className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                    <h1 className="text-2xl font-semibold">Registration Invite Required</h1>
                    <p className="mt-3 text-sm text-red-100">{inviteError || "Invite link is missing."}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white px-4 py-12">
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6">
                <h1 className="text-3xl font-semibold">Member Registration</h1>
                <p className="mt-2 text-sm text-slate-300">
                    You were invited to register as a member. Complete the required details below.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-slate-300">First Name</label>
                        <input
                            name="firstName"
                            value={form.firstName}
                            readOnly
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm opacity-80"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Middle Initials (Optional)</label>
                        <input
                            name="middleInitial"
                            value={form.middleInitial}
                            onChange={onChange}
                            minLength={3}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            placeholder="At least 3 characters if provided"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Last Name</label>
                        <input
                            name="lastName"
                            value={form.lastName}
                            readOnly
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm opacity-80"
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
                            readOnly
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm opacity-80"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">
                            Password <span className="text-xs text-slate-400">(Min 12 chars, uppercase, lowercase, number, symbol: !@#$%&*)</span>
                        </label>
                        <input
                            type="password"
                            name="password"
                            minLength={12}
                            value={form.password}
                            onChange={onChange}
                            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%&*]).{12,}$"
                            title="At least 12 characters, with uppercase, lowercase, number, and one symbol: !@#$%&*"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            minLength={12}
                            value={confirmPassword}
                            onChange={(event) => {
                                const { value } = event.target;
                                setConfirmPassword(value);
                                const passwordsMatch = validatePasswordMatch(value);
                                event.target.setCustomValidity(passwordsMatch ? "" : "Passwords do not match.");
                            }}
                            onBlur={(event) => {
                                const passwordsMatch = validatePasswordMatch(event.target.value);
                                event.target.setCustomValidity(passwordsMatch ? "" : "Passwords do not match.");
                                event.target.reportValidity();
                            }}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Street Address</label>
                        <input
                            name="streetAddress"
                            value={form.streetAddress}
                            onChange={onChange}
                            autoComplete="street-address"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">City</label>
                        <input
                            name="city"
                            value={form.city}
                            onChange={onChange}
                            autoComplete="address-level2"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm text-slate-300">State (2 letters)</label>
                            <input
                                name="state"
                                value={form.state}
                                onChange={onChange}
                                maxLength={2}
                                autoComplete="address-level1"
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm uppercase"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-slate-300">Zip Code</label>
                            <input
                                name="zipCode"
                                inputMode="numeric"
                                pattern="\d{5}"
                                maxLength={5}
                                value={form.zipCode}
                                onChange={onChange}
                                autoComplete="postal-code"
                                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">T-Shirt Size</label>
                        <select
                            name="tshirtSize"
                            value={form.tshirtSize}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        >
                            {T_SHIRT_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Favorite Color</label>
                        <input
                            name="favoriteColor"
                            value={form.favoriteColor}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Jacket Size</label>
                        <select
                            name="jacketSize"
                            value={form.jacketSize}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Select size</option>
                            {JACKET_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Gender</label>
                        <select
                            name="gender"
                            value={form.gender}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Select gender</option>
                            {GENDERS.map((genderOption) => (
                                <option key={genderOption} value={genderOption}>
                                    {genderOption}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Birthday</label>
                        <input
                            type="date"
                            name="birthday"
                            value={form.birthday}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {success && <p className="text-sm text-green-400">{success}</p>}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
                        >
                            {loading ? "Submitting..." : "Register"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
