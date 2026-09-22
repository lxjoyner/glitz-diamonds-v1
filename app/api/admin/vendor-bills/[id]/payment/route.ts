import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { recordVendorBillPayment } from "@/lib/vendor-db";

function requireAccess(req: NextRequest) {
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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;

    const { id } = await context.params;
    const billId = Number(id);
    if (!Number.isInteger(billId) || billId <= 0) {
        return NextResponse.json({ success: false, error: "Invalid bill." }, { status: 400 });
    }

    try {
        const body = await req.json();
        const amountCents = Math.round(Number(body.amount || 0) * 100);
        const payment = await recordVendorBillPayment(billId, amountCents);
        return NextResponse.json({ success: true, payment });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "BILL_NOT_FOUND") return NextResponse.json({ success: false, error: "Bill not found." }, { status: 404 });
        if (message === "INVALID_AMOUNT") return NextResponse.json({ success: false, error: "Enter a valid payment amount." }, { status: 400 });
        if (message === "AMOUNT_EXCEEDS_BALANCE") return NextResponse.json({ success: false, error: "Payment cannot exceed the amount due." }, { status: 400 });
        console.error("Record vendor bill payment failed:", error);
        return NextResponse.json({ success: false, error: "Failed to record payment." }, { status: 500 });
    }
}
