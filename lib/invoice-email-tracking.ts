import crypto from "node:crypto";
import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureInvoiceSchema } from "@/lib/invoice-db";

/** An unguessable identifier per successful send attempt.
 * Distinguishes an email-security scanner opening the tracking pixel from
 * a real customer opening their invoice in a browser.
 */
export async function prepareInvoiceEmailTracking(invoiceId: number) {
    await ensureInvoiceSchema();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_email_tracking (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            invoice_id BIGINT NOT NULL,
            tracking_token CHAR(64) NOT NULL UNIQUE,
            recipient_email VARCHAR(180) NOT NULL,
            sent_at DATETIME NULL,
            opened_at DATETIME NULL,
            open_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_invoice_email_tracking_invoice (invoice_id),
            CONSTRAINT fk_invoice_email_tracking_invoice FOREIGN KEY (invoice_id)
                REFERENCES invoices(id) ON DELETE CASCADE
        )
    `);
    const token = crypto.randomBytes(32).toString("hex");
    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO invoice_email_tracking (invoice_id, tracking_token, recipient_email)
        SELECT id, ?, COALESCE(member_email, ?)
        FROM (SELECT i.id, u.email AS member_email FROM invoices i
            LEFT JOIN users u ON u.id = i.member_id WHERE i.id = ?) selected
    `, [token, "", invoiceId]);
    if (!result.affectedRows) throw new Error("INVOICE_NOT_FOUND");
    return token;
}

export async function confirmInvoiceEmailSent(token: string) {
    const [result] = await pool.execute<ResultSetHeader>(
        "UPDATE invoice_email_tracking SET sent_at = NOW() WHERE tracking_token = ? AND sent_at IS NULL",
        [token]
    );
    if (result.affectedRows !== 1) throw new Error("EMAIL_TRACKING_NOT_FOUND");
    await pool.query(`
        UPDATE invoices i JOIN invoice_email_tracking t ON t.invoice_id = i.id
        SET i.sent_at = COALESCE(i.sent_at, NOW()), i.status = IF(i.status = 'draft', 'sent', i.status)
        WHERE t.tracking_token = ?
    `, [token]);
}

export async function discardUnsentInvoiceTracking(token: string) {
    await pool.execute("DELETE FROM invoice_email_tracking WHERE tracking_token = ? AND sent_at IS NULL", [token]);
}

export async function recordInvoiceEmailPixelOpen(token: string) {
    await ensureInvoiceSchema();
    const [result] = await pool.execute<ResultSetHeader>(`
        UPDATE invoice_email_tracking SET
            opened_at = COALESCE(opened_at, NOW()), open_count = open_count + 1
        WHERE tracking_token = ? AND sent_at IS NOT NULL
    `, [token]);
    if (result.affectedRows) {
        await pool.execute(`
            UPDATE invoices i
            JOIN invoice_email_tracking t ON t.invoice_id = i.id
            SET i.email_opened_at = COALESCE(i.email_opened_at, NOW())
            WHERE t.tracking_token = ?
        `, [token]);
    }
}

export async function listInvoiceEmailTracking() {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT invoice_id, COUNT(*) AS sent_count,
            SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) AS opened_count
        FROM invoice_email_tracking
        WHERE sent_at IS NOT NULL GROUP BY invoice_id
    `);
    return rows;
}
