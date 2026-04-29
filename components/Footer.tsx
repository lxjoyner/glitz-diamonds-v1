"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type FooterStats = {
    visitsToday: number;
    contactsToday: number;
    visitsTotal: number;
    contactsTotal: number;
};

export default function Footer() {
    const pathname = usePathname();

    const [stats, setStats] = useState<FooterStats>({
        visitsToday: 0,
        contactsToday: 0,
        visitsTotal: 0,
        contactsTotal: 0,
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        async function loadAuthStatusAndStats() {
            try {
                const authRes = await fetch("/api/admin/me", {
                    method: "GET",
                    cache: "no-store",
                });

                const authData = await authRes.json();
                const loggedIn = Boolean(authData?.authenticated);

                setIsAuthenticated(loggedIn);

                // Only load stats if logged in
                if (!loggedIn) return;

                const statsRes = await fetch("/api/stats", {
                    cache: "no-store",
                });

                const statsData = await statsRes.json();

                if (statsData?.success) {
                    setStats({
                        visitsToday: statsData.visitsToday ?? 0,
                        contactsToday: statsData.contactsToday ?? 0,
                        visitsTotal: statsData.visitsTotal ?? 0,
                        contactsTotal: statsData.contactsTotal ?? 0,
                    });
                }
            } catch (error) {
                console.error("Failed to load footer data:", error);
                setIsAuthenticated(false);
            }
        }

        loadAuthStatusAndStats();
    }, [pathname]);

    return (
        <footer className="border-t border-white/10 bg-black/40">
            <div className="container px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-slate-300">

                {/* Left section */}
                <div>
                    <p className="text-slate-400">
                        © {new Date().getFullYear()} Glitz Of Diamonds. All rights reserved.
                    </p>

                    {isAuthenticated && (
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                            <p>
                                Visitors today:{" "}
                                <span className="text-slate-300 font-medium">{stats.visitsToday}</span>
                            </p>

                            <p>
                                Contacts today:{" "}
                                <span className="text-slate-300 font-medium">{stats.contactsToday}</span>
                            </p>

                            <p>
                                Total visitors:{" "}
                                <span className="text-slate-300 font-medium">{stats.visitsTotal}</span>
                            </p>

                            <p>
                                Total contact messages:{" "}
                                <span className="text-slate-300 font-medium">{stats.contactsTotal}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Center navigation */}
                <div className="sm:justify-self-center">
                    <nav className="flex flex-wrap gap-x-4 gap-y-2">
                        <Link href="/" className="hover:underline whitespace-nowrap">Home</Link>
                        <Link href="/about" className="hover:underline whitespace-nowrap">About Us</Link>
                        <Link href="/contact" className="hover:underline whitespace-nowrap">Contact</Link>
                        <Link href="/donate" className="hover:underline whitespace-nowrap">Donate</Link>
                    </nav>
                </div>

                {/* Right section */}
                <div className="sm:justify-self-end">
                    <p className="whitespace-nowrap">Created by Lavasier Joyner</p>
                </div>

            </div>
        </footer>
    );
}