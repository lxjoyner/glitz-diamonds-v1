import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { endRecurringInvoice, getRecurringInvoiceById, updateRecurringInvoice } from "@/lib/recurring-invoice-db";

function requireInvoiceAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) throw new Error("UNAUTHORIZED");
    const payload = verifyAdminToken(token);
    if (!["admin", "treasurer"].includes(payload.role)) throw new Error("FORBIDDEN");
    return payload;
}

function respondAuthError(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
    return null;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        requireInvoiceAdmin(req);
        const { id } = await context.params;
        const recurringInvoice = await getRecurringInvoiceById(Number(id));
        if (!recurringInvoice) return NextResponse.json({ success: false, error: "Recurring invoice not found." }, { status: 404 });
        return NextResponse.json({ success: true, recurringInvoice });
    } catch (error) {
        const authResponse = respondAuthError(error);
        if (authResponse) return authResponse;
        console.error("Failed to load recurring invoice:", error);
        return NextResponse.json({ success: false, error: "Failed to load recurring invoice." }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        requireInvoiceAdmin(req);
        const { id } = await context.params;
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

        const recurringInvoice = await updateRecurringInvoice(Number(id), { memberId, repeatDay, firstInvoiceDate, nextInvoiceDate, amountCents, notes, status });
        if (!recurringInvoice) return NextResponse.json({ success: false, error: "Recurring invoice not found." }, { status: 404 });
        return NextResponse.json({ success: true, recurringInvoice });
    } catch (error) {
        const authResponse = respondAuthError(error);
        if (authResponse) return authResponse;
        console.error("Failed to update recurring invoice:", error);
        return NextResponse.json({ success: false, error: "Failed to update recurring invoice." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        requireInvoiceAdmin(req);
        const { id } = await context.params;
        const recurringInvoice = await endRecurringInvoice(Number(id));
        if (!recurringInvoice) return NextResponse.json({ success: false, error: "Recurring invoice not found." }, { status: 404 });
        return NextResponse.json({ success: true, recurringInvoice });
    } catch (error) {
        const authResponse = respondAuthError(error);
        if (authResponse) return authResponse;
        console.error("Failed to end recurring invoice:", error);
        return NextResponse.json({ success: false, error: "Failed to end recurring invoice." }, { status: 500 });
    }
}
