import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createRecurringInvoice, listRecurringInvoices } from "@/lib/recurring-invoice-db";

function requireInvoiceAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) throw new Error("UNAUTHORIZED");
    const payload = verifyAdminToken(token);
    if (!["admin", "treasurer"].includes(payload.role)) throw new Error("FORBIDDEN");
    return payload;
}

export async function GET(req: NextRequest) {
    try {
        requireInvoiceAdmin(req);
        const recurringInvoices = await listRecurringInvoices();
        return NextResponse.json({ success: true, recurringInvoices });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
        if (message === "FORBIDDEN") return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
        console.error("Failed to list recurring invoices:", error);
        return NextResponse.json({ success: false, error: "Failed to load recurring invoices." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        requireInvoiceAdmin(req);
        const body = await req.json();
        const memberId = Number(body?.memberId);
        const repeatDay = Number(body?.repeatDay);
        const amountCents = Math.round(Number(body?.amount || 0) * 100);
        const firstInvoiceDate = String(body?.firstInvoiceDate || "").trim();
        const nextInvoiceDate = String(body?.nextInvoiceDate || firstInvoiceDate).trim();
        const status = body?.status === "draft" ? "draft" : "active";
        const notes = String(body?.notes || "").trim();

        if (!Number.isInteger(memberId) || memberId <= 0) return NextResponse.json({ success: false, error: "Select a member." }, { status: 400 });
        if (!Number.isInteger(repeatDay) || repeatDay < 1 || repeatDay > 28) return NextResponse.json({ success: false, error: "Repeat day must be between 1 and 28." }, { status: 400 });
        if (!firstInvoiceDate || !nextInvoiceDate) return NextResponse.json({ success: false, error: "First and next invoice dates are required." }, { status: 400 });
        if (!Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ success: false, error: "Invoice amount must be greater than 0." }, { status: 400 });

        const recurringInvoice = await createRecurringInvoice({ memberId, repeatDay, firstInvoiceDate, nextInvoiceDate, amountCents, notes, status });
        return NextResponse.json({ success: true, recurringInvoice }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
        if (message === "FORBIDDEN") return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
        console.error("Failed to create recurring invoice:", error);
        return NextResponse.json({ success: false, error: "Failed to create recurring invoice." }, { status: 500 });
    }
}
