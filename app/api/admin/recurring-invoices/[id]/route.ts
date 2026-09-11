import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { endRecurringInvoice, getRecurringInvoiceById, updateRecurringInvoice, type RecurringFrequency, type RecurringEndMode } from "@/lib/recurring-invoice-db";

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

const VALID_FREQUENCIES = new Set<RecurringFrequency>(["daily", "weekly", "monthly", "yearly", "custom"]);
const VALID_END_MODES = new Set<RecurringEndMode>(["after", "on", "never"]);

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
        const existing = await getRecurringInvoiceById(Number(id));
        if (!existing) return NextResponse.json({ success: false, error: "Recurring invoice not found." }, { status: 404 });

        const memberId = Number(body?.memberId ?? existing.member_id);
        const repeatDay = Number(body?.repeatDay ?? existing.repeat_day);
        const amountCents = Math.round(Number(body?.amount ?? Number(existing.amount_cents) / 100) * 100);
        const firstInvoiceDate = String(body?.firstInvoiceDate ?? existing.first_invoice_date ?? "").slice(0, 10);
        const nextInvoiceDate = String(body?.nextInvoiceDate ?? existing.next_invoice_date ?? firstInvoiceDate).slice(0, 10);
        const status = body?.status === "draft" ? "draft" : body?.status === "ended" ? "ended" : "active";
        const notes = String(body?.notes ?? existing.notes ?? "").trim();
        const requestedFrequency = String(body?.frequency ?? existing.frequency ?? existing.cadence ?? "monthly").toLowerCase() as RecurringFrequency;
        const frequency = VALID_FREQUENCIES.has(requestedFrequency) ? requestedFrequency : "monthly";
        const requestedEndMode = String(body?.endMode ?? existing.end_mode ?? "never").toLowerCase() as RecurringEndMode;
        const endMode = VALID_END_MODES.has(requestedEndMode) ? requestedEndMode : "never";
        const weeklyDay = body?.weeklyDay !== undefined ? String(body.weeklyDay) : (existing.weekly_day || "Monday");
        const yearlyMonth = Number(body?.yearlyMonth ?? existing.yearly_month ?? 1);
        const customEvery = Number(body?.customEvery ?? existing.custom_every ?? 1);
        const customUnit = String(body?.customUnit ?? existing.custom_unit ?? "Month(s)");
        const endAfterCount = Number(body?.endAfterCount ?? existing.end_after_count ?? 1);
        const endDate = endMode === "on" ? String(body?.endDate ?? existing.end_date ?? "").slice(0, 10) : "";
        const timeZone = String(body?.timeZone ?? existing.time_zone ?? "US/Central");

        if (!Number.isInteger(memberId) || memberId <= 0) return NextResponse.json({ success: false, error: "Select a member." }, { status: 400 });
        if (!Number.isInteger(repeatDay) || repeatDay < 1 || repeatDay > 31) return NextResponse.json({ success: false, error: "Repeat day must be between 1 and 31." }, { status: 400 });
        if (!firstInvoiceDate || !nextInvoiceDate) return NextResponse.json({ success: false, error: "First and next invoice dates are required." }, { status: 400 });
        if (!Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ success: false, error: "Invoice amount must be greater than 0." }, { status: 400 });
        if (frequency === "yearly" && (!Number.isInteger(yearlyMonth) || yearlyMonth < 1 || yearlyMonth > 12)) return NextResponse.json({ success: false, error: "Select a valid yearly month." }, { status: 400 });
        if (frequency === "custom" && (!Number.isInteger(customEvery) || customEvery < 1)) return NextResponse.json({ success: false, error: "Custom interval must be at least 1." }, { status: 400 });
        if (endMode === "after" && (!Number.isInteger(endAfterCount) || endAfterCount < 1)) return NextResponse.json({ success: false, error: "End-after count must be at least 1." }, { status: 400 });
        if (endMode === "on" && !endDate) return NextResponse.json({ success: false, error: "Select an end date." }, { status: 400 });

        const recurringInvoice = await updateRecurringInvoice(Number(id), {
            memberId,
            repeatDay,
            firstInvoiceDate,
            nextInvoiceDate,
            amountCents,
            notes,
            status,
            frequency,
            weeklyDay,
            yearlyMonth,
            customEvery,
            customUnit,
            endMode,
            endAfterCount,
            endDate,
            timeZone,
        });
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
