import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createRecurringInvoice, listRecurringInvoices, type RecurringFrequency, type RecurringEndMode } from "@/lib/recurring-invoice-db";

function requireInvoiceAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) throw new Error("UNAUTHORIZED");
    const payload = verifyAdminToken(token);
    if (!["admin", "treasurer"].includes(payload.role)) throw new Error("FORBIDDEN");
    return payload;
}

const VALID_FREQUENCIES = new Set<RecurringFrequency>(["daily", "weekly", "monthly", "yearly", "custom"]);
const VALID_END_MODES = new Set<RecurringEndMode>(["after", "on", "never"]);

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
        const firstInvoiceDate = String(body?.firstInvoiceDate || "").slice(0, 10);
        const nextInvoiceDate = String(body?.nextInvoiceDate || firstInvoiceDate).slice(0, 10);
        const status = body?.status === "draft" ? "draft" : "active";
        const notes = String(body?.notes || "").trim();
        const requestedFrequency = String(body?.frequency || "monthly").toLowerCase() as RecurringFrequency;
        const frequency = VALID_FREQUENCIES.has(requestedFrequency) ? requestedFrequency : "monthly";
        const requestedEndMode = String(body?.endMode || "never").toLowerCase() as RecurringEndMode;
        const endMode = VALID_END_MODES.has(requestedEndMode) ? requestedEndMode : "never";
        const weeklyDay = String(body?.weeklyDay || "Monday");
        const yearlyMonth = Number(body?.yearlyMonth || 1);
        const customEvery = Number(body?.customEvery || 1);
        const customUnit = String(body?.customUnit || "Month(s)");
        const endAfterCount = Number(body?.endAfterCount || 1);
        const endDate = endMode === "on" ? String(body?.endDate || "").slice(0, 10) : "";
        const timeZone = String(body?.timeZone || "US/Central");

        if (!Number.isInteger(memberId) || memberId <= 0) return NextResponse.json({ success: false, error: "Select a member." }, { status: 400 });
        if (!Number.isInteger(repeatDay) || repeatDay < 1 || repeatDay > 31) return NextResponse.json({ success: false, error: "Repeat day must be between 1 and 31." }, { status: 400 });
        if (!firstInvoiceDate || !nextInvoiceDate) return NextResponse.json({ success: false, error: "First and next invoice dates are required." }, { status: 400 });
        if (!Number.isFinite(amountCents) || amountCents <= 0) return NextResponse.json({ success: false, error: "Invoice amount must be greater than 0." }, { status: 400 });
        if (frequency === "yearly" && (!Number.isInteger(yearlyMonth) || yearlyMonth < 1 || yearlyMonth > 12)) return NextResponse.json({ success: false, error: "Select a valid yearly month." }, { status: 400 });
        if (frequency === "custom" && (!Number.isInteger(customEvery) || customEvery < 1)) return NextResponse.json({ success: false, error: "Custom interval must be at least 1." }, { status: 400 });
        if (endMode === "after" && (!Number.isInteger(endAfterCount) || endAfterCount < 1)) return NextResponse.json({ success: false, error: "End-after count must be at least 1." }, { status: 400 });
        if (endMode === "on" && !endDate) return NextResponse.json({ success: false, error: "Select an end date." }, { status: 400 });

        const recurringInvoice = await createRecurringInvoice({ memberId, repeatDay, firstInvoiceDate, nextInvoiceDate, amountCents, notes, status, frequency, weeklyDay, yearlyMonth, customEvery, customUnit, endMode, endAfterCount, endDate, timeZone });
        return NextResponse.json({ success: true, recurringInvoice }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
        if (message === "FORBIDDEN") return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
        console.error("Failed to create recurring invoice:", error);
        return NextResponse.json({ success: false, error: "Failed to create recurring invoice." }, { status: 500 });
    }
}
