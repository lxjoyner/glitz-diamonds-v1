import type { OverdueInvoiceSummary } from "@/lib/invoice-overdue-summary";

const money = (cents: number) => new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
}).format(Number(cents || 0) / 100);
const month = (month: number) => new Date(Date.UTC(2000, month - 1, 1))
    .toLocaleString("en-US", { month: "long", timeZone: "UTC" });

/** Shared overdue table for public, printable and admin invoice pages. */
export default function InvoiceOverdueTable({ summary }: { summary: OverdueInvoiceSummary }) {
    if (!summary.rows.length) return null;

    return (
        <section className="mt-8 break-inside-avoid" aria-label="Over Due Invoice Payments">
            <table className="w-full max-w-md border-collapse border border-slate-500 text-sm">
                <thead>
                    <tr className="bg-slate-950 text-white">
                        <th className="px-3 py-2 text-center" colSpan={3}>Over Due Invoice Payments</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-900">
                        <th className="border border-slate-400 px-3 py-2 text-left">Year</th>
                        <th className="border border-slate-400 px-3 py-2 text-left">Month</th>
                        <th className="border border-slate-400 px-3 py-2 text-right">Amount Due</th>
                    </tr>
                </thead>
                <tbody>
                    {summary.rows.map((row) => (
                        <tr key={`${row.year}-${row.month}`}>
                            <td className="border border-slate-400 px-3 py-2">{row.year}</td>
                            <td className="border border-slate-400 px-3 py-2">{month(row.month)}</td>
                            <td className="border border-slate-400 px-3 py-2 text-right">{money(row.amountDueCents)}</td>
                        </tr>
                    ))}
                    <tr className="bg-red-600 font-bold text-white">
                        <td colSpan={2} className="px-3 py-2">Total Over Due</td>
                        <td className="px-3 py-2 text-right">{money(summary.totalCents)}</td>
                    </tr>
                </tbody>
            </table>
            <p className="mt-2 max-w-md text-xs text-slate-500">
                Previous overdue invoices only; the current invoice amount is separate.
            </p>
        </section>
    );
}
