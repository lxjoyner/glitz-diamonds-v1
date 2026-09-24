import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { sendInvoicePaymentReceipt } from "@/lib/invoice-receipt";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const user = verifyAdminToken(token);
        if (!["admin", "treasurer"].includes(user.role)) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const invoiceId = Number(id);
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) {
        return NextResponse.json({ success: false, error: "Invalid invoice." }, { status: 400 });
    }

    try {
        const receipt = await sendInvoicePaymentReceipt({ invoiceId, resend: true });
        if (receipt.status === "in_progress") {
            return NextResponse.json({
                success: false, error: "A receipt is already being sent. Please try again shortly.",
            }, { status: 409 });
        }
        return NextResponse.json({ success: true, receipt });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "INVOICE_NOT_FOUND") {
            return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        }
        if (message === "NO_PAYMENT") {
            return NextResponse.json({ success: false, error: "Record a payment before sending a receipt." }, { status: 400 });
        }
        if (message === "The customer does not have an email address.") {
            return NextResponse.json({ success: false, error: message }, { status: 400 });
        }
        console.error("Manual invoice receipt send failed:", error);
        return NextResponse.json({
            success: false,
            error: "The receipt email was not delivered. Please check email configuration and retry.",
        }, { status: 502 });
    }
}
