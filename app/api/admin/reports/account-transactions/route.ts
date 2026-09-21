import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAccountTransactionsReport, listAccountTransactionContacts } from "@/lib/invoice-db";

function requireReportAccess(req: NextRequest) {
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

export async function GET(req: NextRequest) {
    const authError = requireReportAccess(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const memberId = Number(searchParams.get("memberId"));
    const from = String(searchParams.get("from") || "").slice(0, 10);
    const to = String(searchParams.get("to") || "").slice(0, 10);
    const reportType = String(searchParams.get("type") || "accrual");

    if (!Number.isInteger(memberId) || memberId < 0) {
        return NextResponse.json({ success: false, error: "Invalid member." }, { status: 400 });
    }
    if (!from || !to || from > to) {
        return NextResponse.json({ success: false, error: "Valid from and to dates are required." }, { status: 400 });
    }
    if (!["accrual", "cash", "cash_only"].includes(reportType)) {
        return NextResponse.json({ success: false, error: "Invalid report type." }, { status: 400 });
    }

    const rows = await getAccountTransactionsReport({
        memberId,
        fromDate: from,
        toDate: to,
        reportType: reportType as "accrual" | "cash" | "cash_only",
    });
    const contacts = await listAccountTransactionContacts();

    return NextResponse.json({ success: true, rows, contacts });
}
