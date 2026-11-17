import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoiceById } from "@/lib/invoice-db";
import { listInvoicePaymentReversals, listReversibleInvoicePayments, reverseRecordedInvoicePayment } from "@/lib/invoice-payment-reversal";

function requireAdministrator(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    try {
        const user = verifyAdminToken(token);
        if (user.role !== "admin") return { error: NextResponse.json({ error: "Only administrators can reverse payments." }, { status: 403 }) };
        return { actor: user.username };
    } catch {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
}

type Params = { params: Promise<{ id: string }> };
function validId(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export async function GET(req: NextRequest, { params }: Params) {
    const auth = requireAdministrator(req);
    if ("error" in auth) return auth.error;
    const id = Number((await params).id);
    if (!validId(id)) return NextResponse.json({ error: "Invalid invoice ID." }, { status: 400 });
    try {
        const invoice = await getInvoiceById(id);
        if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
        const [payments, reversals] = await Promise.all([listReversibleInvoicePayments(id), listInvoicePaymentReversals(id)]);
        return NextResponse.json({ invoice: {
            id: invoice.id, invoiceNumber: invoice.invoice_number,
            memberName: invoice.member_name, status: invoice.display_status,
            totalCents: invoice.total_cents, amountPaidCents: invoice.amount_paid_cents,
        }, payments, reversals }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Invoice reversal details failed:", error);
        return NextResponse.json({ error: "Unable to load payment history." }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: Params) {
    const auth = requireAdministrator(req);
    if ("error" in auth) return auth.error;
    const invoiceId = Number((await params).id);
    if (!validId(invoiceId)) return NextResponse.json({ error: "Invalid invoice ID." }, { status: 400 });
    try {
        const body = await req.json();
        const paymentId = Number(body?.paymentId);
        const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
        if (!validId(paymentId) || reason.length < 10 || reason.length > 500) {
            return NextResponse.json({ error: "Choose a payment and enter a reason of 10 to 500 characters." }, { status: 400 });
        }
        const result = await reverseRecordedInvoicePayment({ invoiceId, paymentId, reason, actor: auth.actor });
        return NextResponse.json({ success: true, result }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "INVOICE_NOT_FOUND" || code === "PAYMENT_NOT_FOUND") {
            return NextResponse.json({ error: "Invoice or active payment was not found. Refresh the page." }, { status: 404 });
        }
        if (code === "PAYMENT_BALANCE_CONFLICT") {
            return NextResponse.json({ error: "Invoice paid balance has changed or is inconsistent. Do not retry until reconciled." }, { status: 409 });
        }
        if (code === "INVALID_REASON") {
            return NextResponse.json({ error: "Enter a valid reversal reason." }, { status: 400 });
        }
        console.error("Reverse invoice payment failed:", error);
        return NextResponse.json({ error: "Unable to reverse payment. No changes were committed." }, { status: 500 });
    }
}
