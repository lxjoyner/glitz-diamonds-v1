import InvoiceOverdueTable from "@/components/InvoiceOverdueTable";
import { getOverdueSummaryForInvoice } from "@/lib/invoice-overdue-summary";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoiceForEdit } from "@/lib/invoice-db";
import ApproveDraftButton from "@/components/ApproveDraftButton";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100);

function displayDate(value: string) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminInvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("glitz_token")?.value;
    if (!token) redirect("/admin/login");

    try {
        const payload = verifyAdminToken(token);
        if (!["admin", "treasurer"].includes(payload.role)) redirect("/admin");
    } catch {
        redirect("/admin/login");
    }

    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) notFound();

    const invoice = await getInvoiceForEdit(invoiceId);
    if (!invoice) notFound();

    const balance = Math.max(0, Number(invoice.total_cents) - Number(invoice.amount_paid_cents));
    const overdue = await getOverdueSummaryForInvoice(invoice);

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-4 flex justify-end gap-3">
                    <Link href="/admin/reports/account-transactions" className="rounded-full border border-blue-600 bg-white px-5 py-2.5 font-semibold text-blue-700 hover:bg-blue-50">
                        Back to Account Transactions
                    </Link>
                    <Link href={`/admin/invoices/${invoice.id}/edit`} className="rounded-full bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800">
                        Edit invoice
                    </Link>
                    {invoice.status === "draft" && <ApproveDraftButton invoiceId={invoice.id} />}
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-10">
                    <div className="border-b border-slate-200 pb-6">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                            <div>
                                <img src="/api/invoice-logo" alt="Glitz Of Diamonds logo" className="h-20 max-w-64 object-contain" />
                            </div>
                            <div className="text-right">
                                <p className="text-sm uppercase tracking-wide text-slate-500">Invoice</p>
                                <p className="mt-1 text-2xl font-semibold">{invoice.invoice_number}</p>
                                <p className="mt-3 text-sm text-slate-600">Invoice date: {displayDate(invoice.invoice_date)}</p>
                                <p className="text-sm text-slate-600">Due date: {displayDate(invoice.due_date)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-8 py-8 md:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
                            <p className="mt-2 text-lg font-semibold">{invoice.member_name || "Member"}</p>
                            <p className="text-sm text-slate-600">{invoice.member_email || ""}</p>
                        </div>
                        <div className="md:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount due</p>
                            <p className="mt-2 text-3xl font-bold">{money(balance)}</p>
                            <p className="mt-1 text-sm text-slate-500">Status: {String(invoice.display_status).replace(/_/g, " ")}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-200 text-left">
                                    <th className="py-3 pr-4">Description</th>
                                    <th className="py-3 pr-4 text-right">Qty</th>
                                    <th className="py-3 pr-4 text-right">Price</th>
                                    <th className="py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-100">
                                        <td className="py-4 pr-4">{item.description}</td>
                                        <td className="py-4 pr-4 text-right">{Number(item.quantity)}</td>
                                        <td className="py-4 pr-4 text-right">{money(Number(item.unit_price_cents))}</td>
                                        <td className="py-4 text-right font-semibold">{money(Number(item.line_total_cents))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ml-auto mt-8 max-w-sm space-y-3 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><strong>{money(Number(invoice.subtotal_cents))}</strong></div>
                        <div className="flex justify-between"><span>Discount</span><strong>-{money(Number(invoice.discount_cents))}</strong></div>
                        <div className="flex justify-between"><span>Tax</span><strong>{money(Number(invoice.tax_cents))}</strong></div>
                        <div className="flex justify-between border-t border-slate-200 pt-4 text-xl"><span>Total</span><strong>{money(Number(invoice.total_cents))}</strong></div>
                        <div className="flex justify-between text-lg"><span>Amount due</span><strong>{money(balance)}</strong></div>
                    </div>

                    <InvoiceOverdueTable summary={overdue} />

                {invoice.notes ? <div className="mt-8"><h2 className="font-semibold">Notes</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.notes}</p></div> : null}
                    {invoice.terms ? <div className="mt-6"><h2 className="font-semibold">Payment terms</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.terms}</p></div> : null}
                    {invoice.footer_text ? <p className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">{invoice.footer_text}</p> : null}
                </div>
            </div>
        </main>
    );
}
