import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    importHistoricalBills,
    previewHistoricalBills,
    type HistoricalBillInput,
} from "@/lib/historical-vendor-bills";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== "admin") {
            return NextResponse.json({ success: false, error: "Only admins can import historical bills." }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const rows = body?.bills;
        if (!Array.isArray(rows) || rows.length === 0 || rows.length > 250) {
            return NextResponse.json({ success: false, error: "Provide 1–250 historical bill rows." }, { status: 400 });
        }
        const allowedKeys = ["vendorName", "billDate", "dueDate", "amount", "amountPaid", "status", "billNumber", "notes"];
        if (rows.some((row: unknown) => !row || typeof row !== "object" || Array.isArray(row) ||
            allowedKeys.some((key) => {
                const value = (row as Record<string, unknown>)[key];
                return value !== undefined && typeof value !== "string" && typeof value !== "number";
            }))) {
            return NextResponse.json({ success: false, error: "Invalid historical bill rows." }, { status: 400 });
        }
        const bills = rows as HistoricalBillInput[];
        if (body.mode === "preview") {
            const preview = await previewHistoricalBills(bills);
            return NextResponse.json({ success: true, ...preview });
        }
        if (body.mode !== "import") {
            return NextResponse.json({ success: false, error: "Invalid import mode." }, { status: 400 });
        }

        // No partial imports: if any row is invalid or looks like a duplicate,
        // require a new preview and review rather than silently changing the books.
        const result = await importHistoricalBills(bills);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof Error && error.message === "REVIEW_REQUIRED") {
            return NextResponse.json({
                success: false,
                error: "Bill list changed or contains issues. Preview again and resolve flagged rows before importing.",
            }, { status: 409 });
        }
        console.error("Historical bill import failed:", error);
        return NextResponse.json({ success: false, error: "Failed to process historical bills." }, { status: 500 });
    }
}
