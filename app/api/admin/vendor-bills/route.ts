import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createVendorBill } from "@/lib/vendor-db";

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

export async function POST(req: NextRequest) {
    const authError = requireAccess(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const vendorId = Number(body.vendorId);
        const billDate = String(body.billDate || "").slice(0, 10);
        const dueDate = String(body.dueDate || "").slice(0, 10);
        const lines = Array.isArray(body.lines) ? body.lines : [];

        if (!Number.isInteger(vendorId) || vendorId <= 0) {
            return NextResponse.json({ success: false, error: "Vendor is required." }, { status: 400 });
        }
        if (!billDate || !dueDate) {
            return NextResponse.json({ success: false, error: "Bill date and due date are required." }, { status: 400 });
        }
        if (lines.length === 0) {
            return NextResponse.json({ success: false, error: "At least one bill line is required." }, { status: 400 });
        }

        const bill = await createVendorBill({
            vendorId,
            billDate,
            dueDate,
            purchaseOrder: body.purchaseOrder,
            billNumber: body.billNumber,
            notes: body.notes,
            currency: body.currency || "USD",
            lines: lines.map((line: any) => ({
                item: String(line.item || ""),
                expenseCategory: String(line.expenseCategory || ""),
                description: String(line.description || ""),
                quantity: Number(line.quantity || 0),
                priceCents: Math.round(Number(line.price || 0) * 100),
                taxCents: Math.round(Number(line.tax || 0) * 100),
            })),
        });

        return NextResponse.json({ success: true, bill }, { status: 201 });
    } catch (error) {
        console.error("Create vendor bill failed:", error);
        return NextResponse.json({ success: false, error: "Failed to create bill." }, { status: 500 });
    }
}
