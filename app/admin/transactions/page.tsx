"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
};

function displayDate(value: string) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100);

export default function TransactionsPage() {
    const router = useRouter();
    const [rows, setRows] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [search, setSearch] = useState("");
    const [sortDesc, setSortDesc] = useState(true);
    const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [openActionKey, setOpenActionKey] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [uploadKey, setUploadKey] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        async function init() {
            const meRes = await fetch("/api/admin/me", { cache: "no-store" });
            const me = await meRes.json();
            if (!me?.authenticated) return router.push("/admin/login");
            if (!["admin", "treasurer"].includes(me.user?.role)) {
                setMessage("Only admins and treasurers can access transactions.");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch("/api/admin/transactions", { cache: "no-store" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Failed to load transactions.");
                setRows(data.transactions || []);
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to load transactions.");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [router]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        return rows
            .filter((row) => filter === "all" || row.direction === filter)
            .filter((row) => !term || [row.description, row.account_name, row.category].some((value) => String(value || "").toLowerCase().includes(term)))
            .sort((a, b) => {
                const left = new Date(String(a.transaction_date).slice(0, 10) + "T00:00:00").getTime();
                const right = new Date(String(b.transaction_date).slice(0, 10) + "T00:00:00").getTime();
                return sortDesc ? right - left : left - right;
            });
    }, [rows, search, filter, sortDesc]);

    useEffect(() => {
        function closeMenu(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenActionKey(null);
        }
        document.addEventListener("mousedown", closeMenu);
        return () => document.removeEventListener("mousedown", closeMenu);
    }, []);

    async function deleteTransaction(row: Transaction) {
        if (!window.confirm(`Delete transaction "${row.description}"?`)) return;
        const res = await fetch(`/api/admin/transactions/${encodeURIComponent(row.transaction_key)}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            setMessage(data?.error || "Failed to delete transaction.");
            return;
        }
        setRows((current) => current.filter((item) => item.transaction_key !== row.transaction_key));
        setOpenActionKey(null);
    }

    async function uploadReceipt(file: File) {
        if (!uploadKey) return;
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/admin/transactions/${encodeURIComponent(uploadKey)}/receipt`, { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
            setMessage(data?.error || "Failed to upload receipt.");
            return;
        }
        setMessage("Receipt uploaded successfully.");
        setUploadKey(null);
    }

    const allSelected = visible.length > 0 && visible.every((row) => selected.has(row.transaction_key));

    function toggleAll() {
        setSelected((current) => {
            const next = new Set(current);
            if (allSelected) visible.forEach((row) => next.delete(row.transaction_key));
            else visible.forEach((row) => next.add(row.transaction_key));
            return next;
        });
    }

    function toggleOne(key: string) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-4xl font-bold tracking-tight">Transactions</h1>
                    <div className="flex gap-3">
                        <button type="button" className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Add transaction <span aria-hidden="true">⌄</span></button>
                        <button type="button" className="rounded-full border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50">More <span aria-hidden="true">⌄</span></button>
                    </div>
                </div>

                <div className="mb-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-slate-800">
                    ✧ Import transactions securely to automate your bookkeeping and reports.
                </div>

                <div className="mb-2 grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3">
                        <span className="font-medium">▦ &nbsp; All accounts</span>
                        <span className="font-semibold">{money(visible.reduce((sum, row) => sum + (row.direction === "income" ? row.amount_cents : -row.amount_cents), 0))}⌄</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3">
                        <span className="font-medium">⚖ &nbsp; Reconciliation</span>
                        <span className="inline-flex h-7 w-12 rounded-full bg-slate-300 p-1"><span className="h-5 w-5 rounded-full bg-white shadow" /></span>
                    </div>
                </div>

                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                    <strong>Get tax-ready. Run a report to help fill out your return.</strong>
                    <span className="ml-2 text-slate-600">Assign your accounts and categories to official tax form lines, then run a tidy report to help you fill out those boxes on your tax return.</span>
                </div>

                {message && <p className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{message}</p>}

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 appearance-none rounded border border-slate-400 bg-white checked:border-blue-600 checked:bg-blue-600 checked:after:block checked:after:text-center checked:after:text-xs checked:after:leading-[14px] checked:after:text-white checked:after:content-['✓']" />
                                <span>Select all</span>
                            </label>
                            <button type="button" disabled={selected.size === 0} className="rounded-full border border-blue-300 px-3 py-1 text-blue-600 disabled:opacity-40">🗑</button>
                            <button type="button" disabled={selected.size === 0} className="rounded-full border border-blue-300 px-3 py-1 text-blue-600 disabled:opacity-40">✎</button>
                            <button type="button" disabled={selected.size === 0} className="rounded-full border border-blue-300 px-3 py-1 text-blue-600 disabled:opacity-40">↪</button>
                            <button type="button" disabled={selected.size === 0} className="rounded-full border border-blue-300 px-3 py-1 text-blue-600 disabled:opacity-40">✓</button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setFilter((current) => current === "all" ? "income" : current === "income" ? "expense" : "all")} className="rounded-full border border-blue-600 bg-white px-4 py-2 font-semibold text-blue-700">
                                ⏷ Filter{filter !== "all" ? ` (${filter})` : ""}
                            </button>
                            <button type="button" onClick={() => setSortDesc((current) => !current)} className="rounded-full border border-blue-600 bg-white px-4 py-2 font-semibold text-blue-700">↕ Sort</button>
                            <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions" className="w-56 bg-transparent px-3 py-2 italic outline-none" />
                                <span className="border-l border-slate-200 px-3 py-2">⌕</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                                    <th className="w-12 px-4 py-3"></th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Account</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Loading transactions...</td></tr>
                                ) : visible.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No transactions found.</td></tr>
                                ) : visible.map((row) => {
                                    const href = row.source_type === "invoice_payment" ? `/admin/invoices/${row.linked_id}/preview` : `/admin/vendors/bills`;
                                    return (
                                        <tr key={row.transaction_key} className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="px-4 py-4"><input type="checkbox" checked={selected.has(row.transaction_key)} onChange={() => toggleOne(row.transaction_key)} className="h-4 w-4 appearance-none rounded border border-slate-400 bg-white checked:border-blue-600 checked:bg-blue-600 checked:after:block checked:after:text-center checked:after:text-xs checked:after:leading-[14px] checked:after:text-white checked:after:content-['✓']" /></td>
                                            <td className="px-4 py-4 font-semibold">{displayDate(row.transaction_date)}</td>
                                            <td className="px-4 py-4 font-semibold"><Link href={href} className="hover:text-blue-700 hover:underline">{row.description}</Link></td>
                                            <td className="px-4 py-4">{row.account_name}</td>
                                            <td className="px-4 py-4">{row.category}</td>
                                            <td className={`px-4 py-4 text-right font-bold ${row.direction === "income" ? "text-emerald-600" : "text-slate-950"}`}>{money(row.amount_cents)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800">✓</button>
                                                    <div className="relative" ref={openActionKey === row.transaction_key ? menuRef : null}>
                                                        <button type="button" onClick={() => setOpenActionKey((current) => current === row.transaction_key ? null : row.transaction_key)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800">⌄</button>
                                                        {openActionKey === row.transaction_key && (
                                                            <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 text-left shadow-xl">
                                                                <Link href={`/admin/transactions/${encodeURIComponent(row.transaction_key)}/edit`} className="block px-4 py-2 hover:bg-slate-50">Edit more details</Link>
                                                                <button type="button" onClick={() => { setUploadKey(row.transaction_key); fileInputRef.current?.click(); setOpenActionKey(null); }} className="block w-full px-4 py-2 text-left hover:bg-slate-50">Upload receipt</button>
                                                                <button type="button" onClick={() => deleteTransaction(row)} className="block w-full px-4 py-2 text-left text-red-700 hover:bg-red-50">Delete</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.gif,.tif,.tiff,.bmp,.png,.pdf,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadReceipt(file);
                        e.target.value = "";
                    }}
                />
            </div>
        </main>
    );
}
