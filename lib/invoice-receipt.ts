import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getInvoiceForEdit, getInvoiceLogo, getInvoiceSettings } from "@/lib/invoice-db";
import { sendInvoiceReceiptEmail } from "@/lib/mailer";

type PaymentRow = RowDataPacket & {
    id: number;
    payment_date: string;
    amount_cents: number;
    method: string;
    memo: string | null;
};

export type ReceiptSendResult = {
    sent: boolean;
    status: "sent" | "already_sent" | "in_progress";
    historical: boolean;
};

async function ensureReceiptDeliverySchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_receipt_deliveries (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            receipt_key VARCHAR(120) NOT NULL UNIQUE,
            invoice_id BIGINT NOT NULL,
            payment_id BIGINT NULL,
            recipient_email VARCHAR(180) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            attempts INT NOT NULL DEFAULT 0,
            last_error VARCHAR(500) NULL,
            last_attempt_at DATETIME NULL,
            sent_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_receipts_invoice (invoice_id),
            CONSTRAINT fk_invoice_receipts_invoice
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
    `);
}

async function claimReceipt(key: string, invoiceId: number, paymentId: number | null, email: string | null, resend: boolean) {
    await ensureReceiptDeliverySchema();
    await pool.execute(`
        INSERT IGNORE INTO invoice_receipt_deliveries (receipt_key, invoice_id, payment_id, recipient_email)
        VALUES (?, ?, ?, ?)
    `, [key, invoiceId, paymentId, email]);

    // A normal payment event never resends a successfully sent receipt. A deliberate
    // admin resend is allowed, while an in-progress attempt cannot be duplicated.
    const [result] = await pool.execute<ResultSetHeader>(`
        UPDATE invoice_receipt_deliveries
        SET status = 'sending',
            recipient_email = ?,
            attempts = attempts + 1,
            last_error = NULL,
            last_attempt_at = NOW()
        WHERE receipt_key = ?
          AND (
            status IN ('pending', 'failed')
            OR (status = 'sending' AND last_attempt_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
            OR (? = 1 AND status = 'sent')
          )
    `, [email, key, resend ? 1 : 0]);
    if (result.affectedRows === 1) return "claimed" as const;

    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT status FROM invoice_receipt_deliveries WHERE receipt_key = ? LIMIT 1`, [key]
    );
    return rows[0]?.status === "sent" ? "already_sent" as const : "in_progress" as const;
}

async function markReceipt(key: string, sent: boolean, error?: unknown) {
    await pool.execute(`
        UPDATE invoice_receipt_deliveries
        SET status = ?, last_error = ?, sent_at = CASE WHEN ? = 1 THEN NOW() ELSE sent_at END
        WHERE receipt_key = ?
    `, [
        sent ? "sent" : "failed",
        sent ? null : String(error instanceof Error ? error.message : error || "Email delivery failed").slice(0, 500),
        sent ? 1 : 0,
        key,
    ]);
}

/**
 * Send the receipt for one specific saved payment. Call only AFTER the payment's
 * database transaction commits (including from a future verified payment webhook).
 * Repeated event delivery does not resend an already-sent receipt.
 *
 * If paymentId is omitted, an explicit admin request resends the most recent
 * recorded payment. Older imported paid invoices lacking ledger entries receive
 * an explicitly labeled historical-payment acknowledgement instead.
 */
export async function sendInvoicePaymentReceipt(input: {
    invoiceId: number;
    paymentId?: number;
    resend?: boolean;
    baseUrl?: string;
}): Promise<ReceiptSendResult> {
    const invoice = await getInvoiceForEdit(input.invoiceId);
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");

    const paidToDate = Number(invoice.amount_paid_cents || 0);
    if (paidToDate <= 0) throw new Error("NO_PAYMENT");

    const params: Array<number> = [input.invoiceId];
    let paymentSql = `SELECT id,
        DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
        amount_cents, method, memo
        FROM invoice_payments WHERE invoice_id = ?`;
    if (input.paymentId !== undefined) {
        if (!Number.isSafeInteger(input.paymentId) || input.paymentId <= 0) throw new Error("PAYMENT_NOT_FOUND");
        paymentSql += " AND id = ?";
        params.push(input.paymentId);
    }
    paymentSql += " ORDER BY payment_date DESC, id DESC LIMIT 1";
    const [payments] = await pool.query<PaymentRow[]>(paymentSql, params);
    const payment = payments[0];

    // A webhook must always point to a real newly recorded payment; it must
    // never accidentally send an unrelated historical acknowledgement.
    if (input.paymentId !== undefined && !payment) throw new Error("PAYMENT_NOT_FOUND");

    const historical = !payment;
    const receiptKey = payment ? `payment-${payment.id}` : `historical-${invoice.id}`;
    const email = invoice.member_email?.trim() || null;
    const claim = await claimReceipt(receiptKey, invoice.id, payment ? payment.id : null, email, Boolean(input.resend));
    if (claim !== "claimed") return { sent: claim === "already_sent", status: claim, historical };

    try {
        if (!email) throw new Error("The customer does not have an email address.");
        const [settings, logo] = await Promise.all([getInvoiceSettings(), getInvoiceLogo()]);
        const baseUrl = (input.baseUrl?.trim() || process.env.APP_BASE_URL?.trim()
            || (process.env.NODE_ENV === "production" ? "https://glitzofdiamonds.com" : "http://localhost:3000")
        ).replace(/\/$/, "");

        await sendInvoiceReceiptEmail({
            toEmail: email,
            customerName: invoice.member_name || "Member",
            businessName: String(settings?.business_name || "Glitz Of Diamonds"),
            businessAddress: String(settings?.business_address || ""),
            businessPhone: String(settings?.business_phone || ""),
            businessEmail: String(settings?.business_email || ""),
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            paymentDate: payment?.payment_date || null,
            paymentMethod: payment?.method || null,
            paymentAmountCents: payment ? Number(payment.amount_cents) : paidToDate,
            paidToDateCents: paidToDate,
            totalCents: Number(invoice.total_cents),
            remainingCents: Math.max(0, Number(invoice.total_cents) - paidToDate),
            historical,
            memo: payment?.memo || null,
            footerText: invoice.footer_text || String(settings?.footer_text || ""),
            items: invoice.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPriceCents: Number(item.unit_price_cents),
                lineTotalCents: Number(item.line_total_cents),
            })),
            invoiceUrl: invoice.public_token ? `${baseUrl}/invoice/${encodeURIComponent(invoice.public_token)}` : null,
            logo: logo?.logo_data && logo?.logo_mime_type?.startsWith("image/")
                ? { data: logo.logo_data, mimeType: logo.logo_mime_type } : null,
        });

        await markReceipt(receiptKey, true);
        return { sent: true, status: "sent", historical };
    } catch (error) {
        await markReceipt(receiptKey, false, error);
        throw error;
    }
}
