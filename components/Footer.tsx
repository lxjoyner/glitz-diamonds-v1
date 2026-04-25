"use client";

import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/40">
            <div className="container py-8 grid md:grid-cols-3 gap-8 text-sm text-slate-300">

                {/* Left section */}
                <div>
                    <p className="text-slate-400">
                        © {new Date().getFullYear()} Glitz Of Diamonds. All rights reserved.
                    </p>
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
