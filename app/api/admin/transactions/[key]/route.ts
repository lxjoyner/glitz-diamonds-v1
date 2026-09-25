import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteTransactionByKey } from "@/lib/transaction-db";
import { getTransactionForEdit, saveTransactionEdit } from "@/lib/transaction-edit-service";

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
    const transaction = await getTransactionForEdit(key);
    if (!transaction) return NextResponse.json({ success: false, error: "Transaction not found." }, { status: 404 });
    return NextResponse.json({ success: true, transaction });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;
    const { key } = await context.params;

    try {
        const body = await req.json();
        const amount = Math.round(Number(body.amount) * 100);
        const date = String(body.transactionDate || "").slice(0, 10);
        const account = String(body.accountName || "").trim();
        if (!date || !account || !Number.isSafeInteger(amount) || amount <= 0) {
            return NextResponse.json({ success: false, error: "Date, payment account and positive amount are required." }, { status: 400 });
        }
        const result = await saveTransactionEdit(key, {
            transactionDate: date,
            description: String(body.description || ""),
            accountName: account,
            category: String(body.category || ""),
            transactionType: String(body.transactionType || "") as "Deposit" | "Withdrawal",
            amountCents: amount,
            memo: String(body.memo || ""),
            dateVerified: body.dateVerified === true,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        const expected: Record<string, string> = {
            INVALID_DATE: "Enter a valid payment date.",
            INVALID_AMOUNT: "Enter an amount greater than zero.",
            INVALID_DETAILS: "Description, category and notes must be valid.",
            INVALID_ACCOUNT: "Select an active payment account.",
            SOURCE_TYPE_CONFLICT: "The transaction type must match its linked bill or invoice. Reversals require a separate accounting entry.",
            VERIFY_HISTORICAL_DATE: "Verify the actual historical payment date and account before saving.",
            ALREADY_RECONCILED: "This historical payment was already reconciled. Reload Transactions.",
            AMOUNT_EXCEEDS_BILL: "The adjusted paid amount cannot exceed the original bill or invoice total.",
            HISTORICAL_INVOICE_READ_ONLY: "Imported invoices without a dated payment ledger cannot yet be edited from Transactions.",
        };
        if (expected[code]) {
            return NextResponse.json({ success: false, error: expected[code] }, { status: code === "ALREADY_RECONCILED" ? 409 : 400 });
        }
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
