"use client";

import { useEffect } from "react";

export default function PrintControls() {
    useEffect(() => {
        const timer = window.setTimeout(() => {
            window.print();
        }, 150);

        return () => window.clearTimeout(timer);
    }, []);

    return (
        <div className="mb-6 flex justify-end print:hidden">
            <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
                Print / Save as PDF
            </button>
        </div>
    );
}
