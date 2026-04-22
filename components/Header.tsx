"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type AdminUser = {
    id: number;
    username: string;
    role: string;
    fullName?: string | null;
};

function getDisplayName(user: AdminUser | null) {
    if (!user) return "";

    const fullName = user.fullName?.trim();
    if (!fullName) return user.username;

    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];

    return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function Header() {
    const [open, setOpen] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const displayName = getDisplayName(adminUser);

    useEffect(() => {
        async function loadAdminStatus() {
            try {
                const res = await fetch("/api/admin/me", {
                    method: "GET",
                    cache: "no-store",
                });

                const data = await res.json();

                if (data?.authenticated) {
                    setAdminUser(data.user);
                } else {
                    setAdminUser(null);
                }
            } catch (error) {
                console.error("Failed to load admin status:", error);
                setAdminUser(null);
            } finally {
                setLoadingAuth(false);
            }
        }

        loadAdminStatus();
    }, [pathname, open]);

    const handleLogout = async () => {
        try {
            await fetch("/api/admin/logout", {
                method: "POST",
            });

            setAdminUser(null);
            setOpen(false);
            router.push("/");
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50">
                <div className="w-full px-0">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center py-2">
                        {/* Left section: Hamburger + Logo */}
                        <div className="flex items-center pl-0 ml-0">
                            <button
                                aria-label="Toggle navigation"
                                className="mr-3 p-2 rounded-lg hover:bg-white/10 transition"
                                onClick={() => setOpen(true)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-7 h-7"
                                >
                                    <path d="M3.75 5.25h16.5v1.5H3.75zM3.75 11.25h16.5v1.5H3.75zM3.75 17.25h16.5v1.5H3.75z" />
                                </svg>
                            </button>

                            <Link href="/" className="flex items-center gap-3 shrink-0">
                                <Image
                                    src="/GlitzOfDiamond_Logo.png"
                                    alt="Glitz Of Diamonds logo"
                                    width={160}
                                    height={40}
                                    className="h-12 w-auto"
                                    priority
                                />
                            </Link>
                        </div>

                        {/* Center title */}
                        <div className="flex justify-center px-2">
                            <h1 className="text-lg md:text-3xl font-semibold text-white tracking-wide drop-shadow text-center whitespace-nowrap">
                                Glitz Of Diamonds
                            </h1>
                        </div>

                        <div className="flex items-center justify-end pr-3 min-w-[6rem]">
                            {!loadingAuth && adminUser && (
                                <Link
                                    href="/admin/messages"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-sm text-white hover:bg-white/10 transition"
                                    aria-label="Open dashboard"
                                >
                                    <span className="text-base leading-none" aria-hidden="true">👤</span>
                                    <span className="max-w-[10rem] truncate">{displayName}</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Left slide-out drawer */}
            <div
                className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] transform bg-black/95 border-r border-white/10 shadow-2xl transition-transform duration-300 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/GlitzOfDiamond_Logo.png"
                            alt="Glitz Of Diamonds logo"
                            width={120}
                            height={32}
                            className="h-10 w-auto"
                        />
                    </div>

                    <button
                        aria-label="Close navigation"
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                        onClick={() => setOpen(false)}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-6 h-6"
                        >
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                <nav className="flex flex-col gap-2 px-4 py-4">
                    <Link
                        href="/"
                        className="nav-link"
                        onClick={() => setOpen(false)}
                    >
                        Home
                    </Link>

                    <Link
                        href="/about"
                        className="nav-link"
                        onClick={() => setOpen(false)}
                    >
                        About Us
                    </Link>

                    <Link
                        href="/contact"
                        className="nav-link"
                        onClick={() => setOpen(false)}
                    >
                        Contact
                    </Link>

                    <Link
                        href="/donate"
                        className="nav-link"
                        onClick={() => setOpen(false)}
                    >
                        Donate
                    </Link>

                    <Link
                        href="/register"
                        className="nav-link"
                        onClick={() => setOpen(false)}
                    >
                        Register
                    </Link>

                    {!loadingAuth && adminUser && (
                        <Link
                            href="/admin/messages"
                            className="nav-link"
                            onClick={() => setOpen(false)}
                        >
                            Dashboard
                        </Link>
                    )}

                    {!loadingAuth && adminUser && (
                        <Link
                            href="/admin/ideas-activities"
                            className="nav-link"
                            onClick={() => setOpen(false)}
                        >
                            Ideas & Activities
                        </Link>
                    )}

                    <div className="mt-4 border-t border-white/10 pt-4">
                        {!loadingAuth && !adminUser && (
                            <Link
                                href="/admin/login"
                                className="btn btn-primary w-fit"
                                onClick={() => setOpen(false)}
                            >
                                Login
                            </Link>
                        )}

                        {!loadingAuth && adminUser && (
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-lg bg-red-800 text-white px-4 py-2 hover:bg-red-600 transition"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </nav>
            </div>
        </>
    );
}
