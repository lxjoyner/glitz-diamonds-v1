"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Transaction = {
    transaction_key: string;
    source_type: "invoice_payment" | "vendor_bill_payment";
    source_id: number;
    linked_id: number;
    transaction_date: string;
    description: string;
    account_name: string;
    category: string;
    amount_cents: number;
    direction: "income" | "expense";
    memo?: string | null;
    contact_name?: string | null;
};

export default function EditTransactionPage() {
    const params = useParams<{ key: string }>();
    const router = useRouter();
    const key = decodeURIComponent(params.key);
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [account, setAccount] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [memo, setMemo] = useState("");
    const [transactionType, setTransactionType] = useState<"Deposit" | "Withdrawal">("Withdrawal");
    const [accounts, setAccounts] = useState<string[]>([]);
    const [dateVerified, setDateVerified] = useState(false);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const dateRef = useRef<HTMLInputElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        async function init() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");

            const res = await fetch(`/api/admin/transactions/${encodeURIComponent(key)}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                setMessage(data?.error || "Failed to load transaction.");
                return;
            }
            const item = data.transaction as Transaction;
            setTransaction(item);
            setDate(String(item.transaction_date).slice(0, 10));
            setDescription(item.description || "");
            setAccount(item.account_name || "");
            setAmount((Number(item.amount_cents || 0) / 100).toFixed(2));
            setCategory(item.category || "");
            setMemo(item.memo || "");
        }
        init();
    }, [key, router]);

    async function save(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch(`/api/admin/transactions/${encodeURIComponent(key)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transactionDate: date,
                    description,
                    accountName: account,
                    category,
                    amount: Number(amount),
                    memo,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to save transaction.");
            router.push("/admin/transactions");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to save transaction.");
        } finally {
            setSaving(false);
        }
    }

    async function upload(file: File) {
        setUploading(true);
        setMessage("");
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`/api/admin/transactions/${encodeURIComponent(key)}/receipt`, { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to upload receipt.");
            setMessage("Receipt uploaded successfully.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to upload receipt.");
        } finally {
            setUploading(false);
        }
    }

    if (!transaction) {
        return <main className="min-h-screen bg-[#f7f9fc] px-4 py-8"><div className="mx-auto max-w-3xl">{message || "Loading transaction..."}</div></main>;
    }

    const readOnly = key.startsWith("invoice-history-") || key.startsWith("bill-history-");

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                    <h1 className="text-2xl font-bold">Edit transaction</h1>
                    <button type="button" onClick={() => router.push("/admin/transactions")} className="text-3xl text-slate-400 hover:text-slate-700">×</button>
                </div>

                <form onSubmit={save}>
                    <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Date</span>
                            <div className="relative">
                                <input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={readOnly} className="w-full rounded-xl border border-blue-300 px-4 py-3 pr-14 disabled:bg-slate-100 [&::-webkit-calendar-picker-indicator]:opacity-0" />
                                <button type="button" disabled={readOnly} onClick={() => dateRef.current?.showPicker()} className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-40">📅</button>
                            </div>
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Description</span>
                            <input value={description} onChange={(e) => setDescription(e.target.value)} disabled className="rounded-xl border border-blue-300 bg-slate-100 px-4 py-3" />
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Account</span>
                            <input value={account} onChange={(e) => setAccount(e.target.value)} disabled={readOnly} className="rounded-xl border border-blue-300 px-4 py-3 disabled:bg-slate-100" />
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Type</span>
                            <input value={transaction.direction === "income" ? "Deposit" : "Withdrawal"} disabled className="rounded-xl border border-blue-300 bg-slate-100 px-4 py-3" />
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Amount</span>
                            <div className="flex rounded-xl border border-blue-300">
                                <span className="px-3 py-3 text-slate-500">USD</span>
                                <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={readOnly} className="w-full rounded-r-xl px-3 py-3 text-right outline-none disabled:bg-slate-100" />
                            </div>
                        </label>

                        <label className="grid gap-2">
                            <span className="font-semibold text-slate-600">Category</span>
                            <input value={category} onChange={(e) => setCategory(e.target.value)} disabled className="rounded-xl border border-blue-300 bg-slate-100 px-4 py-3" />
                        </label>

                        <label className="grid gap-2 md:col-span-1">
                            <span className="font-semibold text-slate-600">{transaction.direction === "income" ? "Customer" : "Vendor"}</span>
                            <input value={transaction.contact_name || ""} disabled className="rounded-xl border border-blue-300 bg-slate-100 px-4 py-3" />
                        </label>

                        <div className="md:col-span-2">
                            <button type="button" className="rounded-full border border-blue-600 px-4 py-2 font-semibold text-blue-700">Split transaction</button>
                        </div>

                        <label className="grid gap-2 md:col-span-2">
                            <span className="text-lg font-semibold">Notes</span>
                            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} disabled={readOnly} rows={4} placeholder="Write a note here..." className="rounded-xl border border-blue-300 px-4 py-3 disabled:bg-slate-100" />
                        </label>

                        <div className="md:col-span-2">
                            <h2 className="mb-3 text-lg font-semibold">Receipt</h2>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) upload(file);
                                }}
                                className="rounded-xl border-2 border-dashed border-blue-500 p-6 text-center"
                            >
                                <p className="font-medium">Drag your file here or</p>
                                <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-blue-700 hover:underline">select a file to upload</button>
                                <p className="mt-3 text-sm text-slate-500">Files must be 6MB or smaller, and in one of these formats: JPG, JPEG, GIF, TIFF, TIF, BMP, PNG, PDF, or HEIC</p>
                                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.gif,.tif,.tiff,.bmp,.png,.pdf,.heic,.heif" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ""; }} />
                                {uploading && <p className="mt-3 text-sm text-blue-700">Uploading receipt...</p>}
                            </div>
                        </div>

                        {readOnly && <p className="md:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This historical imported payment is read-only because it does not have a payment-ledger record.</p>}
                        {message && <p className="md:col-span-2 rounded-lg bg-slate-50 p-3 text-sm">{message}</p>}
                    </div>

                    <div className="flex justify-between border-t border-slate-200 px-6 py-4">
                        <button type="button" className="rounded-full border border-blue-600 px-5 py-2.5 font-semibold text-blue-700">✓ Mark as reviewed</button>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => router.push("/admin/transactions")} className="rounded-full border border-blue-600 px-6 py-2.5 font-semibold text-blue-700">Cancel</button>
                            <button disabled={saving || readOnly} className="rounded-full bg-blue-700 px-7 py-2.5 font-semibold text-white disabled:bg-blue-200">{saving ? "Saving..." : "Save"}</button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}
