"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50">
            <div className="container mx-auto px-0">
                {/* TOP ROW */}
                <div className="flex items-center py-1">
                    {/* Left: Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-3 shrink-0"
                    >
                        <Image
                            src="/GlitzOfDiamond_Logo.png"
                            alt="Glitz Of Diamonds logo"
                            width={160}
                            height={40}
                            className="h-12 w-auto"
                            priority
                        />
                    </Link>

                    {/* Spacer pushes everything else to the right */}
                    <div className="flex-1" />

                    {/* Right: Nav + Login + Mobile button */}
                    <div className="flex items-center gap-6 pr-2 md:pr-8">
                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-1">
                            <Link href="#home" className="nav-link">Home</Link>
                            <Link href="#about" className="nav-link">About Us</Link>
                            <Link href="#contact" className="nav-link">Contact</Link>
                        </nav>

                        {/* Login button (desktop) */}
                        <div className="hidden md:block">
                            <Link href="#login" className="rounded-lg bg-black text-white px-4 py-2 hover:bg-gray-900 transition">
                                Login
                            </Link>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            aria-label="Toggle navigation"
                            className="md:hidden p-2 rounded-lg hover:bg-white/10"
                            onClick={() => setOpen(!open)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-6 h-6"
                            >
                                <path d="M3.75 5.25h16.5v1.5H3.75zM3.75 11.25h16.5v1.5H3.75zM3.75 17.25h16.5v1.5H3.75z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile drawer */}
                {open && (
                    <div className="md:hidden border-t border-white/10 pb-3">
                        <div className="flex flex-col gap-2 pt-3">
                            <Link href="#home" className="nav-link" onClick={() => setOpen(false)}>Home</Link>
                            <Link href="#about" className="nav-link" onClick={() => setOpen(false)}>About Us</Link>
                            <Link href="#contact" className="nav-link" onClick={() => setOpen(false)}>Contact</Link>
                            <Link href="#login" className="btn btn-primary mt-2 w-fit" onClick={() => setOpen(false)}>Login</Link>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
