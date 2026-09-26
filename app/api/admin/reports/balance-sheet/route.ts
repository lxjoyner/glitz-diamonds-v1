import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoicesDonationsBalanceSheet, type BalanceSheetType } from "@/lib/invoices-donations-balance-sheet";

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const asOf = searchParams.get("asOf") || "";
    const reportType = searchParams.get("type") || "accrual";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !["accrual", "cash"].includes(reportType)) {
        return NextResponse.json({ success: false, error: "Select a valid as-of date and report type." }, { status: 400 });
    }
    try {
        const report = await getInvoicesDonationsBalanceSheet(asOf, reportType as BalanceSheetType);
        return NextResponse.json({ success: true, report });
    } catch (error) {
        if (error instanceof Error && ["INVALID_DATE", "INVALID_REPORT_TYPE"].includes(error.message)) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        console.error("Invoices & Donations balance sheet failed:", error);
        return NextResponse.json({ success: false, error: "Unable to load balance sheet." }, { status: 500 });
    }
}
