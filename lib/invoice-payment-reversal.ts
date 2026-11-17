import pool from "@/lib/db";
import { ensureInvoiceSchema } from "@/lib/invoice-db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export type ReversibleInvoicePayment = {
    id: number; amount_cents: number; payment_date: string;
    method: string; account_name: string; memo: string | null;
};

let auditReady = false;
async function ensureAuditTable() {
    if (auditReady) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS invoice_payment_reversals (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        original_payment_id BIGINT NOT NULL UNIQUE,
        invoice_id BIGINT NOT NULL,
        member_id BIGINT NOT NULL,
        payment_date DATE NOT NULL,
        amount_cents INT NOT NULL,
        method VARCHAR(50) NOT NULL,
        account_name VARCHAR(120) NOT NULL,
        memo VARCHAR(500) NULL,
        prior_invoice_status VARCHAR(30) NOT NULL,
        reason VARCHAR(500) NOT NULL,
        reversed_by VARCHAR(160) NOT NULL,
        reversed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_invoice_payment_reversal_invoice (invoice_id)
    )`);
    auditReady = true;
}

export async function listReversibleInvoicePayments(invoiceId: number): Promise<ReversibleInvoicePayment[]> {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT p.id, p.amount_cents, DATE_FORMAT(p.payment_date,'%Y-%m-%d') AS payment_date,
               p.method,p.account_name,p.memo
        FROM invoice_payments p WHERE p.invoice_id = ? ORDER BY p.id DESC
    `, [invoiceId]);
    return rows as ReversibleInvoicePayment[];
}

export async function reverseRecordedInvoicePayment(input: {
    invoiceId: number; paymentId: number; reason: string; actor: string;
}) {
    await ensureInvoiceSchema();
    await ensureAuditTable();
    const reason = input.reason.trim();
    if (reason.length < 10 || reason.length > 500) throw new Error("INVALID_REASON");
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // Lock invoice first, matching recordInvoicePayment's lock order.
        const [invoices] = await conn.query<RowDataPacket[]>(`
            SELECT id,member_id,total_cents,amount_paid_cents,status
            FROM invoices WHERE id=? FOR UPDATE
        `, [input.invoiceId]);
        const invoice = invoices[0];
        if (!invoice) throw new Error("INVOICE_NOT_FOUND");
        const [payments] = await conn.query<RowDataPacket[]>(`
            SELECT id, invoice_id, member_id, amount_cents, payment_date, method, account_name, memo
            FROM invoice_payments WHERE id=? AND invoice_id=? FOR UPDATE
        `, [input.paymentId,input.invoiceId]);
        const payment = payments[0];
        if (!payment) throw new Error("PAYMENT_NOT_FOUND");
        const previousPaid = Number(invoice.amount_paid_cents);
        const reversedCents = Number(payment.amount_cents);
        if (!Number.isSafeInteger(previousPaid) || !Number.isSafeInteger(reversedCents) || reversedCents <= 0 || previousPaid < reversedCents) {
            throw new Error("PAYMENT_BALANCE_CONFLICT");
        }
        const newPaid = previousPaid - reversedCents;
        const total = Number(invoice.total_cents);
        const nextStatus = newPaid === 0 ? "sent" : newPaid >= total && total > 0 ? "paid" : "partially_paid";

        // Audit and ledger removal are atomic. Only the incorrect payment row is
        // removed; original details remain permanently in the reversal audit.
        await conn.execute<ResultSetHeader>(`
            INSERT INTO invoice_payment_reversals
                (original_payment_id,invoice_id,member_id,payment_date,amount_cents,method,
                 account_name,memo,prior_invoice_status,reason,reversed_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `, [payment.id,input.invoiceId,payment.member_id,payment.payment_date,
            reversedCents,payment.method,payment.account_name,payment.memo,
            invoice.status,reason,input.actor]);
        const [removed] = await conn.execute<ResultSetHeader>(
            "DELETE FROM invoice_payments WHERE id=? AND invoice_id=?", [input.paymentId,input.invoiceId]
        );
        if (removed.affectedRows !== 1) throw new Error("PAYMENT_NOT_FOUND");
        await conn.execute<ResultSetHeader>(
            "UPDATE invoices SET amount_paid_cents=?,status=? WHERE id=?",
            [newPaid,nextStatus,input.invoiceId]
        );
        await conn.commit();
        return { invoiceId: input.invoiceId, originalPaymentId: input.paymentId, reversedCents, amountPaidCents: newPaid, status: nextStatus };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function listInvoicePaymentReversals(invoiceId: number) {
    await ensureAuditTable();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT original_payment_id,amount_cents,reason,reversed_by,
               DATE_FORMAT(reversed_at,'%Y-%m-%d %H:%i:%s') AS reversed_at
        FROM invoice_payment_reversals WHERE invoice_id=? ORDER BY reversed_at DESC
    `, [invoiceId]);
    return rows;
}
