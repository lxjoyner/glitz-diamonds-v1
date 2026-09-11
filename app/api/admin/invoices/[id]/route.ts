import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteInvoice, getInvoiceById } from "@/lib/invoice-db";

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

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;

    try {
        const { id } = await context.params;
        const invoiceId = Number(id);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
        }

        const invoice = await getInvoiceById(invoiceId);
        if (!invoice) {
            return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        }

        const deleted = await deleteInvoice(invoiceId);
        if (!deleted) {
            return NextResponse.json({ success: false, error: "Invoice could not be deleted." }, { status: 500 });
        }

        return NextResponse.json({ success: true, invoiceNumber: invoice.invoice_number });
    } catch (error) {
        console.error("Invoice DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete invoice." }, { status: 500 });
    }
}
