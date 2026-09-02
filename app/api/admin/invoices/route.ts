import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createInvoice, listInvoices } from "@/lib/invoice-db";

function requireInvoiceManager(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== "admin" && payload.role !== "treasurer") {
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
    try {
        const invoices = await listInvoices();
        return NextResponse.json({ success: true, invoices });
    } catch (error) {
        console.error("Invoice GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to load invoices." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    try {
        const body = await req.json();
        const memberId = Number(body.memberId);
        const items = Array.isArray(body.items) ? body.items : [];
        if (!Number.isInteger(memberId) || memberId <= 0 || !body.invoiceDate || !body.dueDate || items.length === 0) {
            return NextResponse.json({ success: false, error: "Member, invoice date, due date, and at least one item are required." }, { status: 400 });
        }
        const normalizedItems = items.map((item: Record<string, unknown>) => ({
            description: String(item.description || "").trim(),
            quantity: Number(item.quantity || 0),
            unitPriceCents: Math.round(Number(item.unitPrice || 0) * 100),
        }));
        if (normalizedItems.some((item: { description: string; quantity: number; unitPriceCents: number }) => !item.description || item.quantity <= 0 || item.unitPriceCents < 0)) {
            return NextResponse.json({ success: false, error: "Each invoice item needs a description, quantity greater than zero, and a valid price." }, { status: 400 });
        }
        const invoice = await createInvoice({
            memberId,
            invoiceDate: String(body.invoiceDate),
            dueDate: String(body.dueDate),
            referenceNumber: String(body.referenceNumber || ""),
            notes: String(body.notes || ""),
            terms: String(body.terms || ""),
            discountCents: Math.round(Number(body.discount || 0) * 100),
            taxCents: Math.round(Number(body.tax || 0) * 100),
            items: normalizedItems,
        });
        return NextResponse.json({ success: true, invoice }, { status: 201 });
    } catch (error) {
        console.error("Invoice POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to create invoice." }, { status: 500 });
    }
}
