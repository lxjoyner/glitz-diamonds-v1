import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getTransactionAccounts } from "@/lib/transaction-edit-service";

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
    try {
        const accounts = await getTransactionAccounts();
        return NextResponse.json({ success: true, accounts });
    } catch (error) {
        console.error("Transaction accounts lookup failed:", error);
        return NextResponse.json({ success: false, error: "Unable to load payment accounts." }, { status: 500 });
    }
}
