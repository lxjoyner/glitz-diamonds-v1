import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoiceById, markInvoiceSent } from "@/lib/invoice-db";
import { sendInvoiceEmail } from "@/lib/mailer";

function requireInvoiceManager(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== "admin" && payload.role !== "treasurer") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
        return null;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

function getBaseUrl(req: NextRequest) {
    const configured = process.env.APP_BASE_URL?.trim();
    if (configured) return configured.replace(/\/$/, "");
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || req.headers.get("host") || "www.glitzofdiamonds.com";
    const protocol = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${protocol}://${host}`.replace(/\/$/, "");
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;

    try {
        const { id } = await context.params;
        const invoiceId = Number(id);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
        }

        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        if (!invoice.member_email) return NextResponse.json({ success: false, error: "The selected member does not have an email address." }, { status: 400 });

        const publicUrl = `${getBaseUrl(req)}/invoice/${invoice.public_token}`;
        await sendInvoiceEmail({
            toEmail: invoice.member_email,
            memberName: invoice.member_name || "Member",
            invoiceNumber: invoice.invoice_number,
            amountDueCents: Math.max(0, invoice.total_cents - invoice.amount_paid_cents),
            dueDate: String(invoice.due_date),
            invoiceUrl: publicUrl,
        });

        await markInvoiceSent(invoiceId);
        return NextResponse.json({ success: true, invoiceUrl: publicUrl });
    } catch (error) {
        console.error("Invoice send error:", error);
        return NextResponse.json({ success: false, error: "Failed to send invoice." }, { status: 500 });
    }
}
