import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { listDueRecurringInvoices, listRecurringRunDiagnostics } from "@/lib/recurring-invoice-db";
import { runRecurringInvoiceScheduler } from "@/lib/recurring-invoice-scheduler";

function authorize(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return false;
    try {
        const user = verifyAdminToken(token);
        return user.role === "admin" || user.role === "treasurer";
    } catch { return false; }
}

// A safe diagnostic endpoint for the recurring invoice administration page.
// The cron secret must never be sent to the browser or embedded in client code.
export async function GET(req: NextRequest) {
    if (!authorize(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const timeZone = "America/Chicago";
        const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
            .format(new Date());
        const [due, history] = await Promise.all([listDueRecurringInvoices(date), listRecurringRunDiagnostics()]);
        return NextResponse.json({
            success: true, today: date,
            cronConfigured: Boolean(process.env.RECURRING_INVOICE_CRON_SECRET?.trim()),
            dueCount: due.length,
            due: due.map(row => ({
                id: row.id, memberName: row.member_name, hasEmail: Boolean(row.member_email),
                nextInvoiceDate: String(row.next_invoice_date).slice(0,10),
            })),
            history,
        }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Recurring invoice diagnostics failed:",error);
        return NextResponse.json({ success: false, error: "Unable to load recurring job history." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!authorize(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Chicago", year: "numeric",month: "2-digit",day: "2-digit"
        }).format(new Date());
        const result = await runRecurringInvoiceScheduler(date);
        return NextResponse.json({ success: true, date, ...result }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Manual recurring invoice scheduler run failed:", error);
        return NextResponse.json({ success: false, error: "Recurring scheduler failed. Check application server logs." }, { status: 500 });
    }
}
