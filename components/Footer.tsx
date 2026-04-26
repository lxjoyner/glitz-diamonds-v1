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
        async function loadStats() {
            try {
                const res = await fetch("/api/stats");
                const data = await res.json();

                if (data?.success) {
                    setStats({
                        visitsToday: data.visitsToday ?? 0,
                        contactsToday: data.contactsToday ?? 0,
                        visitsTotal: data.visitsTotal ?? 0,
                        contactsTotal: data.contactsTotal ?? 0,
                    });
                }
            } catch (error) {
                console.error("Failed to load footer stats:", error);
            }
        }

        async function loadAuthStatus() {
            try {
                const res = await fetch("/api/admin/me", {
                    method: "GET",
                    cache: "no-store",
                });
                const data = await res.json();
                setIsAuthenticated(Boolean(data?.authenticated));
            } catch (error) {
                console.error("Failed to load auth status for footer:", error);
                setIsAuthenticated(false);
            }
        }

        loadStats();
        loadAuthStatus();
    }, [pathname]);

    const showTodayStats = pathname === "/" && isAuthenticated;

    return (
        <footer className="border-t border-white/10 bg-black/40">
            <div className="container py-8 grid md:grid-cols-3 gap-8 text-sm text-slate-300">

                {/* Left section */}
                <div>
                    <p className="text-slate-400">
                        © {new Date().getFullYear()} Glitz Of Diamonds. All rights reserved.
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                        {showTodayStats && (
                            <>
                                <p>
                                    Visitors today:{" "}
                                    <span className="text-slate-300 font-medium">{stats.visitsToday}</span>
                                </p>
                                <p>
                                    Contacts today:{" "}
                                    <span className="text-slate-300 font-medium">{stats.contactsToday}</span>
                                </p>
                            </>
                        )}

                        <p>
                            Total visitors:{" "}
                            <span className="text-slate-300 font-medium">{stats.visitsTotal}</span>
                        </p>
                        <p>
                            Total contact messages:{" "}
                            <span className="text-slate-300 font-medium">{stats.contactsTotal}</span>
                        </p>
                    </div>
                </div>

                {/* Center navigation */}
                <div className="md:justify-self-center">
                    <nav className="space-x-4">
                        <Link href="/" className="hover:underline">Home</Link>
                        <Link href="/about" className="hover:underline">About Us</Link>
                        <Link href="/contact" className="hover:underline">Contact</Link>
                        <Link href="/donate" className="hover:underline">Donate</Link>
                    </nav>
                </div>

                {/* Right section */}
                <div className="md:justify-self-end">
                    <p>Created by Lavasier Joyner</p>
                </div>

            </div>
        </footer>
    );
}
