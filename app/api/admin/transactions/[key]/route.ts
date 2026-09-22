import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteTransactionByKey, getTransactionByKey, updateTransactionByKey } from "@/lib/transaction-db";

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

export async function GET(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;
    const { key } = await context.params;
    const transaction = await getTransactionByKey(key);
    if (!transaction) return NextResponse.json({ success: false, error: "Transaction not found." }, { status: 404 });
    return NextResponse.json({ success: true, transaction });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;
    const { key } = await context.params;

    try {
        const body = await req.json();
        const amount = Math.round(Number(body.amount || 0) * 100);
        if (!body.transactionDate || !body.accountName || !Number.isInteger(amount) || amount <= 0) {
            return NextResponse.json({ success: false, error: "Date, account, and a valid amount are required." }, { status: 400 });
        }
        const transaction = await updateTransactionByKey(key, {
            transactionDate: String(body.transactionDate).slice(0, 10),
            description: String(body.description || ""),
            accountName: String(body.accountName || ""),
            category: String(body.category || ""),
            amountCents: amount,
            memo: String(body.memo || ""),
        });
        return NextResponse.json({ success: true, transaction });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "HISTORICAL_TRANSACTION_READ_ONLY") {
            return NextResponse.json({ success: false, error: "Historical imported payments cannot be edited directly." }, { status: 400 });
        }
        if (code === "NOT_FOUND") {
            return NextResponse.json({ success: false, error: "Transaction not found." }, { status: 404 });
        }
        console.error("Update transaction failed:", error);
        return NextResponse.json({ success: false, error: "Failed to update transaction." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;
    const { key } = await context.params;

    try {
        await deleteTransactionByKey(key);
        return NextResponse.json({ success: true });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "HISTORICAL_TRANSACTION_READ_ONLY") {
            return NextResponse.json({ success: false, error: "Historical imported payments cannot be deleted directly." }, { status: 400 });
        }
        if (code === "NOT_FOUND") {
            return NextResponse.json({ success: false, error: "Transaction not found." }, { status: 404 });
        }
        console.error("Delete transaction failed:", error);
        return NextResponse.json({ success: false, error: "Failed to delete transaction." }, { status: 500 });
    }
}
