import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteInvoice, getInvoiceForEdit, updateInvoice } from "@/lib/invoice-db";

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

function normalizeInvoiceInput(body: Record<string, unknown>) {
    const memberId = Number(body.memberId);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!Number.isInteger(memberId) || memberId <= 0 || !body.invoiceDate || !body.dueDate || items.length === 0) {
        throw new Error("Member, invoice date, due date, and at least one item are required.");
    }
    const normalizedItems = items.map((item) => {
        const value = item as Record<string, unknown>;
        return {
            description: String(value.description || "").trim(),
            quantity: Number(value.quantity || 0),
            unitPriceCents: Math.round(Number(value.unitPrice || 0) * 100),
        };
    });
    if (normalizedItems.some((item) => !item.description || item.quantity <= 0 || item.unitPriceCents < 0)) {
        throw new Error("Each invoice item needs a description, quantity greater than zero, and a valid price.");
    }
    return {
        memberId,
        invoiceDate: String(body.invoiceDate),
        dueDate: String(body.dueDate),
        referenceNumber: String(body.referenceNumber || ""),
        notes: String(body.notes || ""),
        terms: String(body.terms || ""),
        footerText: String(body.footerText || ""),
        discountCents: Math.round(Number(body.discount || 0) * 100),
        taxCents: Math.round(Number(body.tax || 0) * 100),
        items: normalizedItems,
    };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    try {
        const { id } = await context.params;
        const invoiceId = Number(id);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
        }
        const invoice = await getInvoiceForEdit(invoiceId);
        if (!invoice) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        return NextResponse.json({ success: true, invoice });
    } catch (error) {
        console.error("Invoice GET by id error:", error);
        return NextResponse.json({ success: false, error: "Failed to load invoice." }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;
    try {
        const { id } = await context.params;
        const invoiceId = Number(id);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
        }
        const existing = await getInvoiceForEdit(invoiceId);
        if (!existing) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        const body = await req.json() as Record<string, unknown>;
        let input;
        try {
            input = normalizeInvoiceInput(body);
        } catch (error) {
            return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Invalid invoice data." }, { status: 400 });
        }
        const invoice = await updateInvoice(invoiceId, input);
        return NextResponse.json({ success: true, invoice });
    } catch (error) {
        console.error("Invoice PUT error:", error);
        return NextResponse.json({ success: false, error: "Failed to update invoice." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireInvoiceManager(req);
    if (authError) return authError;

    try {
        const { id } = await context.params;
        const invoiceId = Number(id);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
        }

        const invoice = await getInvoiceForEdit(invoiceId);
        if (!invoice) {
            return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
        }

        const deleted = await deleteInvoice(invoiceId);
        if (!deleted) {
            return NextResponse.json({ success: false, error: "Invoice could not be deleted." }, { status: 500 });
        }

        return NextResponse.json({ success: true, invoiceNumber: invoice.invoice_number });
    } catch (error) {
        console.error("Invoice DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete invoice." }, { status: 500 });
    }
}
