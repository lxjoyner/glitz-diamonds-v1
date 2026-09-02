import { notFound } from "next/navigation";
import { getInvoiceByPublicToken, markInvoiceViewed } from "@/lib/invoice-db";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const invoice = await getInvoiceByPublicToken(token);
    if (!invoice) notFound();
    await markInvoiceViewed(token);

    const balance = Math.max(0, Number(invoice.total_cents) - Number(invoice.amount_paid_cents));

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg sm:p-10">
                <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
                    <div>
                        {invoice.has_logo ? <img src="/api/invoice-logo" alt="Glitz Of Diamonds logo" className="mb-4 h-20 max-w-64 object-contain" /> : null}
                        <h1 className="text-3xl font-bold">{invoice.business_name || "Glitz Of Diamonds"}</h1>
                        {invoice.business_address ? <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.business_address}</p> : null}
                        {invoice.business_phone ? <p className="text-sm text-slate-600">{invoice.business_phone}</p> : null}
                        {invoice.business_email ? <p className="text-sm text-slate-600">{invoice.business_email}</p> : null}
                    </div>
                    <div className="text-right">
                        <p className="text-sm uppercase tracking-wide text-slate-500">Invoice</p>
                        <p className="mt-1 text-2xl font-semibold">{invoice.invoice_number}</p>
                        <p className="mt-3 text-sm text-slate-600">Invoice date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
                        <p className="text-sm text-slate-600">Due date: {new Date(invoice.due_date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="grid gap-8 py-8 md:grid-cols-2">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
                        <p className="mt-2 text-lg font-semibold">{invoice.member_name}</p>
                        <p className="text-sm text-slate-600">{invoice.member_email}</p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount due</p>
                        <p className="mt-2 text-3xl font-bold">{money(balance)}</p>
                        <p className="mt-1 text-sm text-slate-500">Status: {String(invoice.display_status).replace(/_/g, " ")}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse text-sm">
                        <thead><tr className="border-b-2 border-slate-200 text-left"><th className="py-3 pr-4">Description</th><th className="py-3 pr-4 text-right">Qty</th><th className="py-3 pr-4 text-right">Price</th><th className="py-3 text-right">Amount</th></tr></thead>
                        <tbody>{invoice.items.map((item: any, index: number) => <tr key={index} className="border-b border-slate-100"><td className="py-4 pr-4">{item.description}</td><td className="py-4 pr-4 text-right">{Number(item.quantity)}</td><td className="py-4 pr-4 text-right">{money(Number(item.unit_price_cents))}</td><td className="py-4 text-right font-semibold">{money(Number(item.line_total_cents))}</td></tr>)}</tbody>
                    </table>
                </div>

                <div className="ml-auto mt-8 max-w-sm space-y-3 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><strong>{money(Number(invoice.subtotal_cents))}</strong></div>
                    <div className="flex justify-between"><span>Discount</span><strong>-{money(Number(invoice.discount_cents))}</strong></div>
                    <div className="flex justify-between"><span>Tax</span><strong>{money(Number(invoice.tax_cents))}</strong></div>
                    <div className="flex justify-between border-t border-slate-200 pt-4 text-xl"><span>Total</span><strong>{money(Number(invoice.total_cents))}</strong></div>
                    <div className="flex justify-between text-lg"><span>Amount due</span><strong>{money(balance)}</strong></div>
                </div>

                {invoice.notes ? <div className="mt-8"><h2 className="font-semibold">Notes</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.notes}</p></div> : null}
                {invoice.terms ? <div className="mt-6"><h2 className="font-semibold">Payment terms</h2><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{invoice.terms}</p></div> : null}
                {invoice.footer_text ? <p className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">{invoice.footer_text}</p> : null}
            </div>
        </main>
    );
}
