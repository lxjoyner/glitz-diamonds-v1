import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    createInvoicePaymentAccount,
    createInvoicePaymentMethod,
    listInvoicePaymentAccounts,
    listInvoicePaymentMethods,
    renameInvoicePaymentAccount,
    renameInvoicePaymentMethod,
} from "@/lib/invoice-db";

function requireInvoiceManager(req: NextRequest) {
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
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    const [methods, accounts] = await Promise.all([
        listInvoicePaymentMethods(),
        listInvoicePaymentAccounts(),
    ]);
    return NextResponse.json({ success: true, methods, accounts });
}

export async function POST(req: NextRequest) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    try {
        const body = await req.json();
        const type = String(body?.type || "");
        const name = String(body?.name || "");
        const item = type === "method"
            ? await createInvoicePaymentMethod(name)
            : type === "account"
                ? await createInvoicePaymentAccount(name)
                : null;
        if (!item) return NextResponse.json({ success: false, error: "Invalid option type." }, { status: 400 });
        return NextResponse.json({ success: true, item }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "INVALID_NAME") return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
        if (String(message).includes("Duplicate")) return NextResponse.json({ success: false, error: "That option already exists." }, { status: 409 });
        console.error("Payment option create error:", error);
        return NextResponse.json({ success: false, error: "Failed to create payment option." }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    try {
        const body = await req.json();
        const type = String(body?.type || "");
        const id = Number(body?.id);
        const name = String(body?.name || "");
        if (!Number.isInteger(id) || id <= 0) {
            return NextResponse.json({ success: false, error: "Invalid option." }, { status: 400 });
        }
        const item = type === "method"
            ? await renameInvoicePaymentMethod(id, name)
            : type === "account"
                ? await renameInvoicePaymentAccount(id, name)
                : null;
        if (!item) return NextResponse.json({ success: false, error: "Invalid option type." }, { status: 400 });
        return NextResponse.json({ success: true, item });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "INVALID_NAME") return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
        if (message === "NOT_FOUND") return NextResponse.json({ success: false, error: "Payment option not found." }, { status: 404 });
        if (String(message).includes("Duplicate")) return NextResponse.json({ success: false, error: "That option already exists." }, { status: 409 });
        console.error("Payment option rename error:", error);
        return NextResponse.json({ success: false, error: "Failed to update payment option." }, { status: 500 });
    }
}
