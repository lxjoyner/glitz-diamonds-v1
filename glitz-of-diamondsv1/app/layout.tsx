import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import React from "react";

export const metadata: Metadata = {
    title: "Glitz Of Diamonds",
    description: "Luxury that sparkles on every page.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="min-h-screen grid grid-rows-[auto_1fr_auto]">
        <Header />
        <main>{children}</main>
        <Footer />
        </body>
        </html>
    );
}