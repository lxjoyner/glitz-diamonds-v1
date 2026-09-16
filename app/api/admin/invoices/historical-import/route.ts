import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import pool from "@/lib/db";
import { createInvoice, ensureInvoiceSchema } from "@/lib/invoice-db";
import type { RowDataPacket } from "mysql2/promise";

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) throw new Error("UNAUTHORIZED");
    const payload = verifyAdminToken(token);
    if (payload.role !== "admin") throw new Error("FORBIDDEN");
    return payload;
}

type HistoricalInvoiceInput = {
    oldInvoiceNumber?: string;
    invoiceDate: string;
    dueDate?: string;
    amount: number;
    amountPaid?: number;
    status?: "paid" | "unpaid" | "overdue";
    recurring?: boolean;
    description?: string;
};

type PreviewResult = {
    oldInvoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    amountPaid: number;
    status: "paid" | "unpaid" | "overdue";
    recurring: boolean;
    description: string;
    duplicate: boolean;
    duplicateInvoiceNumber?: string;
};

function normalizeDate(value: unknown) {
    const text = String(value || "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return text;
    const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!us) return "";
    const month = String(Number(us[1])).padStart(2, "0");
    const day = String(Number(us[2])).padStart(2, "0");
    return `${us[3]}-${month}-${day}`;
}

function statusFromInput(value: unknown): "paid" | "unpaid" | "overdue" {
    const normalized = String(value || "unpaid").trim().toLowerCase();
    if (normalized === "paid") return "paid";
    if (normalized === "overdue" || normalized === "past due" || normalized === "past_due") return "overdue";
    return "unpaid";
}

async function findDuplicate(memberId: number, invoiceDate: string, oldInvoiceNumber: string) {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, invoice_number, reference_number
         FROM invoices
         WHERE member_id = ?
           AND invoice_date = ?
           AND (? = '' OR reference_number = ?)
         ORDER BY id DESC
         LIMIT 1`,
        [memberId, invoiceDate, oldInvoiceNumber, oldInvoiceNumber]
    );
    return rows[0] as { id: number; invoice_number: string; reference_number: string | null } | undefined;
}

async function setHistoricalPaymentState(invoiceId: number, status: "paid" | "unpaid" | "overdue", amountPaidCents: number, totalCents: number) {
    if (status === "paid") {
        await pool.query(
            `UPDATE invoices
             SET status = 'paid', amount_paid_cents = ?, sent_at = COALESCE(sent_at, created_at)
             WHERE id = ?`,
            [Math.min(totalCents, Math.max(0, amountPaidCents || totalCents)), invoiceId]
        );
        return;
    }

    await pool.query(
        `UPDATE invoices
         SET status = 'sent', amount_paid_cents = ?
         WHERE id = ?`,
        [Math.min(totalCents, Math.max(0, amountPaidCents)), invoiceId]
    );
}

export async function POST(req: NextRequest) {
    try {
        requireAdmin(req);
        await ensureInvoiceSchema();

        const body = await req.json();
        const memberId = Number(body?.memberId);
        const mode = body?.mode === "import" ? "import" : "preview";
        const invoices = Array.isArray(body?.invoices) ? (body.invoices as HistoricalInvoiceInput[]) : [];

        if (!Number.isInteger(memberId) || memberId <= 0) {
            return NextResponse.json({ success: false, error: "Select a valid member." }, { status: 400 });
        }
        if (invoices.length === 0) {
            return NextResponse.json({ success: false, error: "Add at least one historical invoice." }, { status: 400 });
        }
        if (invoices.length > 250) {
            return NextResponse.json({ success: false, error: "Import up to 250 invoices at a time." }, { status: 400 });
        }

        const [memberRows] = await pool.query<RowDataPacket[]>(
            `SELECT id, full_name, email FROM users WHERE id = ? LIMIT 1`,
            [memberId]
        );
        if (!memberRows[0]) {
            return NextResponse.json({ success: false, error: "Member was not found." }, { status: 404 });
        }

        const preview: PreviewResult[] = [];

        for (const raw of invoices) {
            const invoiceDate = normalizeDate(raw.invoiceDate);
            const dueDate = normalizeDate(raw.dueDate || raw.invoiceDate);
            const oldInvoiceNumber = String(raw.oldInvoiceNumber || "").trim();
            const amount = Number(raw.amount || 0);
            const amountPaid = Number(raw.amountPaid || 0);
            const status = statusFromInput(raw.status);
            const recurring = Boolean(raw.recurring);
            const description = String(raw.description || (recurring ? "Recurring membership invoice" : "Historical membership invoice")).trim();

            if (!invoiceDate || !dueDate || !Number.isFinite(amount) || amount <= 0) {
                return NextResponse.json(
                    { success: false, error: "Every row needs a valid invoice date, due date, and amount greater than 0." },
                    { status: 400 }
                );
            }

            const duplicate = await findDuplicate(memberId, invoiceDate, oldInvoiceNumber);
            preview.push({
                oldInvoiceNumber,
                invoiceDate,
                dueDate,
                amount,
                amountPaid,
                status,
                recurring,
                description,
                duplicate: Boolean(duplicate),
                duplicateInvoiceNumber: duplicate?.invoice_number,
            });
        }

        if (mode === "preview") {
            return NextResponse.json({ success: true, member: memberRows[0], preview });
        }

        const imported: Array<{ oldInvoiceNumber: string; invoiceNumber: string; invoiceId: number }> = [];
        const skipped: PreviewResult[] = [];

        for (const row of preview) {
            if (row.duplicate) {
                skipped.push(row);
                continue;
            }

            const created = await createInvoice({
                memberId,
                invoiceDate: row.invoiceDate,
                dueDate: row.dueDate,
                referenceNumber: row.oldInvoiceNumber ? `Legacy invoice ${row.oldInvoiceNumber}` : "Historical import",
                notes: row.recurring ? "Imported historical recurring invoice." : "Imported historical invoice.",
                items: [{ description: row.description, quantity: 1, unitPriceCents: Math.round(row.amount * 100) }],
            });

            await setHistoricalPaymentState(
                created.id,
                row.status,
                Math.round(row.amountPaid * 100),
                Math.round(row.amount * 100)
            );

            imported.push({ oldInvoiceNumber: row.oldInvoiceNumber, invoiceNumber: created.invoiceNumber, invoiceId: created.id });
        }

        return NextResponse.json({
            success: true,
            member: memberRows[0],
            imported,
            skipped,
            importedCount: imported.length,
            skippedCount: skipped.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
        if (message === "FORBIDDEN") return NextResponse.json({ success: false, error: "Only admins can import historical invoices." }, { status: 403 });
        console.error("Historical invoice import error:", error);
        return NextResponse.json({ success: false, error: "Failed to process historical invoices." }, { status: 500 });
    }
}
