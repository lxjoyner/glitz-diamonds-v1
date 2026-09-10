"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
    admin: "Admin",
    messages: "Dashboard",
    membership: "Registered Users Details",
    "member-invites": "Member Invites",
    "roles-manager": "Roles Manager",
    "ideas-activities": "Ideas & Activities",
    invoices: "Invoices",
    new: "New Invoice",
    settings: "Invoice Settings",
    "forgot-username": "Forgot Username",
    "reset-password": "Reset Password",
    "verify-code": "Verify Code",
    login: "Login",
    about: "About Us",
    contact: "Contact",
    donate: "Donate",
    calendar: "Calendar",
    register: "Register",
    invoice: "Invoice",
};

function toLabel(segment: string) {
    if (LABELS[segment]) return LABELS[segment];
    if (/^[a-f0-9]{32,}$/i.test(segment)) return "Invoice Details";
    if (/^\d+$/.test(segment)) return `#${segment}`;

    return decodeURIComponent(segment)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getBreadcrumbHref(segments: string[], index: number) {
    const segment = segments[index];

    if (index === 0 && segment === "admin") {
        return "/admin/messages";
    }

    if (index === 0 && segment === "invoice") {
        return "/admin/invoices";
    }

    return `/${segments.slice(0, index + 1).join("/")}`;
}

export default function Breadcrumbs() {
    const pathname = usePathname();

    if (!pathname || pathname === "/") return null;

    const segments = pathname.split("/").filter(Boolean);
    const crumbs = segments.map((segment, index) => ({
        href: getBreadcrumbHref(segments, index),
        label: toLabel(segment),
        isLast: index === segments.length - 1,
    }));

    return (
        <nav aria-label="Breadcrumb" className="border-y border-white/10 bg-black/35 px-4 py-2 text-sm text-white/80 sm:px-8">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2">
                <Link href="/" className="font-medium text-white hover:underline">
                    Home
                </Link>
                {crumbs.map((crumb) => (
                    <span key={crumb.href} className="flex items-center gap-2">
                        <span aria-hidden="true" className="text-white/45">/</span>
                        {crumb.isLast ? (
                            <span aria-current="page" className="font-semibold text-white">{crumb.label}</span>
                        ) : (
                            <Link href={crumb.href} className="hover:text-white hover:underline">{crumb.label}</Link>
                        )}
                    </span>
                ))}
            </div>
        </nav>
    );
}
