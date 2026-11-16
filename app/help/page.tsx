"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HelpCenterPage() {
    const [state, setState] = useState<"loading" | "enabled" | "disabled" | "unauthorized">("loading");
    useEffect(() => {
        let mounted = true;
        fetch("/api/help/status", { cache: "no-store" })
            .then(async (response) => {
                const data = await response.json();
                if (mounted) setState(response.status === 401 ? "unauthorized" : response.ok && data.helpEnabled ? "enabled" : "disabled");
            })
            .catch(() => { if (mounted) setState("disabled"); });
        return () => { mounted = false; };
    }, []);

    return (
        <main className="min-h-screen bg-black px-4 py-12 text-white">
            <section className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-white/5 p-7">
                <h1 className="text-3xl font-semibold">Help Center</h1>
                {state === "loading" && <p className="mt-4 text-slate-300">Checking Help availability...</p>}
                {state === "unauthorized" && <p className="mt-4 text-slate-300">Please <Link className="underline" href="/admin/login">sign in</Link> to access Help.</p>}
                {state === "disabled" && <p className="mt-4 text-slate-300">Help is currently disabled by the administrator.</p>}
                {state === "enabled" && <>
                    <p className="mt-4 text-slate-300">Welcome to Glitz Of Diamonds Help. Video tutorials and role-based topics will be added in Phase 2.</p>
                    <p className="mt-3 text-slate-400">You can return to the <Link className="text-red-300 underline" href="/admin/messages">Dashboard</Link> while the tutorial library is being prepared.</p>
                </>}
            </section>
        </main>
    );
}
