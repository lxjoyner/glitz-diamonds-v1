"use client";

import { useEffect } from "react";

export default function PrintControls() {
    useEffect(() => {
        const timer = window.setTimeout(() => {
            window.print();
        }, 100);

        const handleAfterPrint = () => {
            window.close();
        };

        window.addEventListener("afterprint", handleAfterPrint);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("afterprint", handleAfterPrint);
        };
    }, []);

    return null;
}
