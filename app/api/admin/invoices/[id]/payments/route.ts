import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoiceById, recordInvoicePayment } from "@/lib/invoice-db";
import { sendInvoicePaymentReceipt } from "@/lib/invoice-receipt";

function requireInvoiceManager(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (!["admin", "treasurer"].includes(payload.role)) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
        return null;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
        return NextResponse.json({ success: false, error: "Invalid invoice." }, { status: 400 });
    }
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    return NextResponse.json({ success: true, invoice });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;

    try {
        const { id } = await params;
        const invoiceId = Number(id);
        const body = await req.json();
        const amountCents = Math.round(Number(body?.amount || 0) * 100);
        const paymentDate = String(body?.paymentDate || "").slice(0, 10);
        const method = String(body?.method || "").trim();
        const accountName = String(body?.accountName || "").trim();
        const memo = String(body?.memo || "").trim();

        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid invoice." }, { status: 400 });
        }
        if (!paymentDate) return NextResponse.json({ success: false, error: "Payment date is required." }, { status: 400 });
        if (!Number.isFinite(amountCents) || amountCents <= 0) {
            return NextResponse.json({ success: false, error: "Payment amount must be greater than 0." }, { status: 400 });
        }
        if (!method) return NextResponse.json({ success: false, error: "Select a payment method." }, { status: 400 });
        if (!accountName) return NextResponse.json({ success: false, error: "Select a payment account." }, { status: 400 });

        // Save payment first. Receipt email failures must never undo or silently
        // duplicate an otherwise successfully recorded payment.
        const saved = await recordInvoicePayment(invoiceId, { paymentDate, amountCents, method, accountName, memo });
        let receipt: { sent: boolean; status: string } = { sent: false, status: "failed" };
        try {
            receipt = await sendInvoicePaymentReceipt({
                invoiceId,
                paymentId: saved.paymentId,
            });
        } catch (emailError) {
            console.error("Payment saved, but automatic invoice receipt failed:", emailError);
        }
        return NextResponse.json({ success: true, invoice: saved.invoice, receipt });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "INVOICE_NOT_FOUND") return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        if (message === "INVALID_AMOUNT") return NextResponse.json({ success: false, error: "Enter a valid payment amount." }, { status: 400 });
        if (message === "AMOUNT_EXCEEDS_BALANCE") return NextResponse.json({ success: false, error: "Payment amount cannot exceed the remaining invoice balance." }, { status: 400 });
        console.error("Record invoice payment error:", error);
        return NextResponse.json({ success: false, error: "Failed to record payment." }, { status: 500 });
    }
}
