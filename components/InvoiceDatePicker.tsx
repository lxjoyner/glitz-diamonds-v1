"use client";

import { useEffect, useRef, useState } from "react";

function toDisplayDate(value: string) {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return "";
    return `${month}/${day}/${year}`;
}

function toIsoDate(value: string) {
    const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type InvoiceDatePickerProps = {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    placeholder?: string;
    className?: string;
};

export default function InvoiceDatePicker({ value, onChange, ariaLabel, placeholder = "MM/DD/YYYY", className = "" }: InvoiceDatePickerProps) {
    const pickerRef = useRef<HTMLInputElement>(null);
    const [textValue, setTextValue] = useState(() => toDisplayDate(value));
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        setTextValue(toDisplayDate(value));
        setInvalid(false);
    }, [value]);

    const openPicker = () => {
        const input = pickerRef.current;
        if (!input) return;
        if (typeof input.showPicker === "function") input.showPicker();
        else input.click();
    };

    const commitTypedDate = () => {
        if (!textValue.trim()) {
            onChange("");
            setInvalid(false);
            return;
        }
        const parsed = toIsoDate(textValue);
        if (!parsed) {
            setInvalid(true);
            return;
        }
        onChange(parsed);
        setTextValue(toDisplayDate(parsed));
        setInvalid(false);
    };

    return (
        <div className={`relative flex items-center overflow-hidden rounded-lg border bg-white focus-within:ring-2 focus-within:ring-blue-500 ${invalid ? "border-red-500" : "border-slate-300"} ${className}`}>
            <input
                type="text"
                inputMode="numeric"
                value={textValue}
                onChange={(event) => { setTextValue(event.target.value); setInvalid(false); }}
                onBlur={commitTypedDate}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        commitTypedDate();
                    }
                }}
                placeholder={placeholder}
                aria-label={`${ariaLabel} in MM/DD/YYYY format`}
                title={invalid ? "Enter a valid date in MM/DD/YYYY format" : "Enter MM/DD/YYYY or use the calendar"}
                className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-950 outline-none placeholder:italic placeholder:text-slate-500"
            />
            <button type="button" onClick={openPicker} aria-label={`Open ${ariaLabel.toLowerCase()} calendar`} className="flex self-stretch w-10 shrink-0 items-center justify-center border-l border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                </svg>
            </button>
            <input
                ref={pickerRef}
                type="date"
                value={value}
                onChange={(event) => { onChange(event.target.value); setTextValue(toDisplayDate(event.target.value)); setInvalid(false); }}
                aria-hidden="true"
                tabIndex={-1}
                className="pointer-events-none absolute h-px w-px opacity-0"
            />
        </div>
    );
}
