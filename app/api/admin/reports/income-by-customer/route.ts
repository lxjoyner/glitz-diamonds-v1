import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getIncomeByCustomerReport } from "@/lib/invoice-db";

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
    const from = String(searchParams.get("from") || "").slice(0, 10);
    const to = String(searchParams.get("to") || "").slice(0, 10);
    if (!from || !to) {
        return NextResponse.json({ success: false, error: "From and to dates are required." }, { status: 400 });
    }
    if (from > to) {
        return NextResponse.json({ success: false, error: "From date must be before or equal to to date." }, { status: 400 });
    }

    const rows = await getIncomeByCustomerReport(from, to);
    return NextResponse.json({ success: true, rows });
}
