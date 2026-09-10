import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type RecurringInvoiceStatus = "active" | "draft" | "ended";

export type RecurringInvoiceRecord = RowDataPacket & {
    id: number;
    member_id: number;
    member_name: string | null;
    member_email: string | null;
    status: RecurringInvoiceStatus;
    cadence: string;
    repeat_day: number;
    first_invoice_date: string;
    next_invoice_date: string;
    previous_invoice_date: string | null;
    end_date: string | null;
    amount_cents: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type RecurringInvoiceInput = {
    memberId: number;
    status?: RecurringInvoiceStatus;
    repeatDay: number;
    firstInvoiceDate: string;
    nextInvoiceDate: string;
    amountCents: number;
    notes?: string;
};

export async function ensureRecurringInvoiceSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS recurring_invoices (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            member_id BIGINT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            cadence VARCHAR(20) NOT NULL DEFAULT 'monthly',
            repeat_day TINYINT NOT NULL DEFAULT 1,
            first_invoice_date DATE NOT NULL,
            next_invoice_date DATE NOT NULL,
            previous_invoice_date DATE NULL,
            end_date DATE NULL,
            amount_cents INT NOT NULL DEFAULT 0,
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_recurring_member (member_id),
            INDEX idx_recurring_status (status),
            INDEX idx_recurring_next_date (next_invoice_date)
        )
    `);
}

export async function listRecurringInvoices(): Promise<RecurringInvoiceRecord[]> {
    await ensureRecurringInvoiceSchema();
    const [rows] = await pool.query<RecurringInvoiceRecord[]>(`
        SELECT r.*, u.full_name AS member_name, u.email AS member_email
        FROM recurring_invoices r
        LEFT JOIN users u ON u.id = r.member_id
        ORDER BY r.created_at DESC, r.id DESC
    `);
    return rows;
}

export async function getRecurringInvoiceById(id: number): Promise<RecurringInvoiceRecord | null> {
    await ensureRecurringInvoiceSchema();
    const [rows] = await pool.query<RecurringInvoiceRecord[]>(`
        SELECT r.*, u.full_name AS member_name, u.email AS member_email
        FROM recurring_invoices r
        LEFT JOIN users u ON u.id = r.member_id
        WHERE r.id = ?
        LIMIT 1
    `, [id]);
    return rows[0] || null;
}

export async function createRecurringInvoice(input: RecurringInvoiceInput) {
    await ensureRecurringInvoiceSchema();
    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO recurring_invoices (
            member_id, status, cadence, repeat_day, first_invoice_date, next_invoice_date, amount_cents, notes
        ) VALUES (?, ?, 'monthly', ?, ?, ?, ?, ?)
    `, [
        input.memberId,
        input.status || "active",
        input.repeatDay,
        input.firstInvoiceDate,
        input.nextInvoiceDate,
        input.amountCents,
        input.notes || null,
    ]);
    return getRecurringInvoiceById(result.insertId);
}

export async function updateRecurringInvoice(id: number, input: RecurringInvoiceInput) {
    await ensureRecurringInvoiceSchema();
    await pool.query(`
        UPDATE recurring_invoices
        SET member_id = ?, status = ?, repeat_day = ?, first_invoice_date = ?, next_invoice_date = ?, amount_cents = ?, notes = ?
        WHERE id = ?
    `, [
        input.memberId,
        input.status || "active",
        input.repeatDay,
        input.firstInvoiceDate,
        input.nextInvoiceDate,
        input.amountCents,
        input.notes || null,
        id,
    ]);
    return getRecurringInvoiceById(id);
}

export async function endRecurringInvoice(id: number) {
    await ensureRecurringInvoiceSchema();
    await pool.query(`
        UPDATE recurring_invoices
        SET status = 'ended', end_date = CURDATE()
        WHERE id = ?
    `, [id]);
    return getRecurringInvoiceById(id);
}
