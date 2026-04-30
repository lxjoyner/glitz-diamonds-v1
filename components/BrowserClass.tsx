// components/BrowserClass.tsx
"use client";

import { useEffect } from "react";

export default function BrowserClass() {
    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        const html = document.documentElement;

        if (ua.includes("samsungbrowser")) {
            html.classList.add("browser-samsung");
        }

        if (ua.includes("safari") && !ua.includes("chrome")) {
            html.classList.add("browser-safari");
        }

        if (ua.includes("chrome")) {
            html.classList.add("browser-chrome");
        }

        if (ua.includes("edg")) {
            html.classList.add("browser-edge");
        }
    }, []);

    return null;
}