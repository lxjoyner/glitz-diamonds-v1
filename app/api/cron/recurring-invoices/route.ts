import { NextRequest, NextResponse } from "next/server";
import { runRecurringInvoiceScheduler } from "@/lib/recurring-invoice-scheduler";

function authorized(req: NextRequest) {
    const configured = process.env.RECURRING_INVOICE_CRON_SECRET?.trim();
    if (!configured) return false;
    const auth = req.headers.get("authorization") || "";
    return auth === `Bearer ${configured}`;
}

export async function GET(req: NextRequest) {
    if (!authorized(req)) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await runRecurringInvoiceScheduler(today);
        return NextResponse.json({ success: true, today, ...result });
    } catch (error) {
        console.error("Recurring invoice scheduler failed:", error);
        return NextResponse.json({ success: false, error: "Recurring invoice scheduler failed." }, { status: 500 });
    }
}
