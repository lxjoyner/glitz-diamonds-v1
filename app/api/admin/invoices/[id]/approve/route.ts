import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { approveDraftInvoice } from "@/lib/invoice-db";

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
        return NextResponse.json({ success: false, error: "Invalid invoice ID." }, { status: 400 });
    }
    try {
        const result = await approveDraftInvoice(invoiceId);
        if (result === "not_found") {
            return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        }
        if (result === "not_draft") {
            return NextResponse.json({ success: false, error: "Only draft invoices can be approved." }, { status: 409 });
        }
        return NextResponse.json({
            success: true,
            message: "Draft approved. Invoice is ready to send; no email has been sent.",
        });
    } catch (error) {
        console.error("Approve draft invoice failed:", error);
        return NextResponse.json({ success: false, error: "Unable to approve draft invoice." }, { status: 500 });
    }
}
