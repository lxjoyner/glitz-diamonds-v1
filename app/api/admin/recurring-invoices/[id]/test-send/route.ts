import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { runRecurringInvoiceTestSend } from "@/lib/recurring-invoice-scheduler";

function requireInvoiceAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) throw new Error("UNAUTHORIZED");
    const payload = verifyAdminToken(token);
    if (!["admin", "treasurer"].includes(payload.role)) throw new Error("FORBIDDEN");
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        requireInvoiceAdmin(req);
        const { id } = await context.params;
        const recurringInvoiceId = Number(id);
        if (!Number.isInteger(recurringInvoiceId) || recurringInvoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid recurring invoice id." }, { status: 400 });
        }

        const result = await runRecurringInvoiceTestSend(recurringInvoiceId);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
        if (message === "FORBIDDEN") return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
        if (message === "RECURRING_NOT_FOUND") return NextResponse.json({ success: false, error: "Recurring invoice not found." }, { status: 404 });
        if (message === "MISSING_MEMBER_EMAIL") return NextResponse.json({ success: false, error: "The recurring invoice member does not have an email address." }, { status: 400 });
        console.error("Recurring invoice test send failed:", error);
        return NextResponse.json({ success: false, error: "Failed to send recurring invoice test." }, { status: 500 });
    }
}
