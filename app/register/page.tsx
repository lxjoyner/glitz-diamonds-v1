"use client";

import { useState } from "react";

const T_SHIRT_SIZES = ["XS", "SM", "M", "LG", "XL", "XXL", "XXXL", "XXXXL"] as const;
const HAT_SIZES = ["S", "M", "L", "XL"] as const;
const GENDERS = ["Male", "Female"] as const;

export default function RegisterPage() {
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
        hatSize: "",
        gender: "",
        birthday: "",
    });
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = event.target;
        let { value } = event.target;

        if (name === "zipCode") {
            value = value.replace(/\D/g, "").slice(0, 5);
        }

        if (name === "state") {
            value = value.toUpperCase().slice(0, 2);
        }

        if (name === "birthday") {
            const digits = value.replace(/\D/g, "").slice(0, 8);
            if (digits.length <= 2) {
                value = digits;
            } else if (digits.length <= 4) {
                value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
            } else {
                value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
            }
        }

        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (form.middleInitial && form.middleInitial.trim().length < 3) {
                throw new Error("Middle initials must be at least 3 characters when provided.");
            }

            if (form.password !== confirmPassword) {
                throw new Error("Passwords do not match.");
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

            const birthdayDigits = form.birthday.replace(/\D/g, "");
            if (birthdayDigits.length !== 8) {
                throw new Error("Birthday must be in MM/DD/YYYY format.");
            }

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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Registration failed.");
            }

            setSuccess(data?.message || "Registered successfully.");
            setForm({
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
                hatSize: "",
                gender: "",
                birthday: "",
            });
            setConfirmPassword("");
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
                        <label className="mb-1 block text-sm text-slate-300">First Name</label>
                        <input
                            name="firstName"
                            value={form.firstName}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
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
                            onChange={(event) => setConfirmPassword(event.target.value)}
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

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">State</label>
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
                            value={form.zipCode}
                            onChange={onChange}
                            inputMode="numeric"
                            pattern="[0-9]{5}"
                            maxLength={5}
                            minLength={5}
                            autoComplete="postal-code"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
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
                        <label className="mb-1 block text-sm text-slate-300">Hat Size</label>
                        <select
                            name="hatSize"
                            value={form.hatSize}
                            onChange={onChange}
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Select hat size</option>
                            {HAT_SIZES.map((size) => (
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
                            {GENDERS.map((gender) => (
                                <option key={gender} value={gender}>
                                    {gender}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">Birthday (MM/DD/YYYY)</label>
                        <input
                            name="birthday"
                            value={form.birthday}
                            onChange={onChange}
                            inputMode="numeric"
                            pattern="(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/(19|20)[0-9]{2}"
                            maxLength={10}
                            placeholder="MM/DD/YYYY"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                            required
                        />
                        <input
                            type="date"
                            onChange={(event) => {
                                const selected = event.target.value;
                                if (!selected) return;
                                const [year, month, day] = selected.split("-");
                                setForm((prev) => ({
                                    ...prev,
                                    birthday: `${month}/${day}/${year}`,
                                }));
                            }}
                            className="mt-2 w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
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
