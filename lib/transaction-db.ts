import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { ensureInvoiceSchema } from "@/lib/invoice-db";
import { ensureVendorBillPaymentSchema } from "@/lib/vendor-db";

export type TransactionRow = RowDataPacket & {
    transaction_key: string;
    source_type: "invoice_payment" | "vendor_bill_payment";
    source_id: number;
    linked_id: number;
    transaction_date: string;
    description: string;
    account_name: string;
    category: string;
    amount_cents: number;
    direction: "income" | "expense";
};

export async function listTransactions(): Promise<TransactionRow[]> {
    await ensureInvoiceSchema();
    await ensureVendorBillPaymentSchema();

    const [rows] = await pool.query<TransactionRow[]>(`
        SELECT
            CONCAT('invoice-', p.id) AS transaction_key,
            'invoice_payment' AS source_type,
            p.id AS source_id,
            p.invoice_id AS linked_id,
            p.payment_date AS transaction_date,
            CONCAT(COALESCE(u.full_name, CONCAT('Member #', p.member_id)), ' - Payment for Invoice ', i.invoice_number) AS description,
            p.account_name,
            CONCAT('Invoice ', i.invoice_number, ' | Payment from ', COALESCE(u.full_name, CONCAT('Member #', p.member_id))) AS category,
            p.amount_cents,
            'income' AS direction
        FROM invoice_payments p
        JOIN invoices i ON i.id = p.invoice_id
        LEFT JOIN users u ON u.id = p.member_id

        UNION ALL

        SELECT
            CONCAT('invoice-history-', i.id) AS transaction_key,
            'invoice_payment' AS source_type,
            i.id AS source_id,
            i.id AS linked_id,
            i.invoice_date AS transaction_date,
            CONCAT(COALESCE(u.full_name, CONCAT('Member #', i.member_id)), ' - Payment for Invoice ', i.invoice_number) AS description,
            'Cash on Hand (USD)' AS account_name,
            CONCAT('Invoice ', i.invoice_number, ' | Payment from ', COALESCE(u.full_name, CONCAT('Member #', i.member_id))) AS category,
            i.amount_paid_cents AS amount_cents,
            'income' AS direction
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        WHERE i.amount_paid_cents > 0
          AND NOT EXISTS (
              SELECT 1
              FROM invoice_payments p2
              WHERE p2.invoice_id = i.id
          )

        UNION ALL

        SELECT
            CONCAT('bill-', bp.id) AS transaction_key,
            'vendor_bill_payment' AS source_type,
            bp.id AS source_id,
            bp.bill_id AS linked_id,
            bp.payment_date AS transaction_date,
            CONCAT('Bill payment to ', v.vendor_name) AS description,
            bp.account_name,
            CONCAT('Payment to ', v.vendor_name) AS category,
            bp.amount_cents,
            'expense' AS direction
        FROM vendor_bill_payments bp
        JOIN vendor_bills b ON b.id = bp.bill_id
        JOIN vendors v ON v.id = bp.vendor_id

        ORDER BY transaction_date DESC, source_id DESC
    `);
    return rows;
}


export async function getTransactionByKey(key: string) {
    await ensureInvoiceSchema();
    await ensureVendorBillPaymentSchema();

    if (key.startsWith("invoice-history-")) {
        const id = Number(key.replace("invoice-history-", ""));
        if (!Number.isInteger(id) || id <= 0) return null;
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT
                CONCAT('invoice-history-', i.id) AS transaction_key,
                'invoice_payment' AS source_type,
                i.id AS source_id,
                i.id AS linked_id,
                i.invoice_date AS transaction_date,
                CONCAT(COALESCE(u.full_name, CONCAT('Member #', i.member_id)), ' - Payment for Invoice ', i.invoice_number) AS description,
                'Cash on Hand (USD)' AS account_name,
                CONCAT('Invoice ', i.invoice_number, ' | Payment from ', COALESCE(u.full_name, CONCAT('Member #', i.member_id))) AS category,
                i.amount_paid_cents AS amount_cents,
                'income' AS direction,
                NULL AS memo,
                COALESCE(u.full_name, CONCAT('Member #', i.member_id)) AS contact_name
            FROM invoices i
            LEFT JOIN users u ON u.id = i.member_id
            WHERE i.id = ?
            LIMIT 1
        `, [id]);
        return rows[0] || null;
    }

    if (key.startsWith("invoice-")) {
        const id = Number(key.replace("invoice-", ""));
        if (!Number.isInteger(id) || id <= 0) return null;
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT
                CONCAT('invoice-', p.id) AS transaction_key,
                'invoice_payment' AS source_type,
                p.id AS source_id,
                p.invoice_id AS linked_id,
                p.payment_date AS transaction_date,
                CONCAT(COALESCE(u.full_name, CONCAT('Member #', p.member_id)), ' - Payment for Invoice ', i.invoice_number) AS description,
                p.account_name,
                CONCAT('Invoice ', i.invoice_number, ' | Payment from ', COALESCE(u.full_name, CONCAT('Member #', p.member_id))) AS category,
                p.amount_cents,
                'income' AS direction,
                p.memo,
                COALESCE(u.full_name, CONCAT('Member #', p.member_id)) AS contact_name
            FROM invoice_payments p
            JOIN invoices i ON i.id = p.invoice_id
            LEFT JOIN users u ON u.id = p.member_id
            WHERE p.id = ?
            LIMIT 1
        `, [id]);
        return rows[0] || null;
    }

    if (key.startsWith("bill-")) {
        const id = Number(key.replace("bill-", ""));
        if (!Number.isInteger(id) || id <= 0) return null;
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT
                CONCAT('bill-', bp.id) AS transaction_key,
                'vendor_bill_payment' AS source_type,
                bp.id AS source_id,
                bp.bill_id AS linked_id,
                bp.payment_date AS transaction_date,
                CONCAT('Bill payment to ', v.vendor_name) AS description,
                bp.account_name,
                CONCAT('Payment to ', v.vendor_name) AS category,
                bp.amount_cents,
                'expense' AS direction,
                bp.memo,
                v.vendor_name AS contact_name
            FROM vendor_bill_payments bp
            JOIN vendors v ON v.id = bp.vendor_id
            WHERE bp.id = ?
            LIMIT 1
        `, [id]);
        return rows[0] || null;
    }

    return null;
}

export async function updateTransactionByKey(key: string, input: {
    transactionDate: string;
    description: string;
    accountName: string;
    category: string;
    amountCents: number;
    memo?: string;
}) {
    await ensureInvoiceSchema();
    await ensureVendorBillPaymentSchema();

    if (key.startsWith("invoice-history-")) {
        throw new Error("HISTORICAL_TRANSACTION_READ_ONLY");
    }

    if (key.startsWith("invoice-")) {
        const id = Number(key.replace("invoice-", ""));
        if (!Number.isInteger(id) || id <= 0) throw new Error("NOT_FOUND");
        const [result] = await pool.execute<any>(`
            UPDATE invoice_payments
            SET payment_date = ?, account_name = ?, amount_cents = ?, memo = ?
            WHERE id = ?
        `, [input.transactionDate, input.accountName, input.amountCents, input.memo || null, id]);
        if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
        return getTransactionByKey(key);
    }

    if (key.startsWith("bill-")) {
        const id = Number(key.replace("bill-", ""));
        if (!Number.isInteger(id) || id <= 0) throw new Error("NOT_FOUND");
        const [result] = await pool.execute<any>(`
            UPDATE vendor_bill_payments
            SET payment_date = ?, account_name = ?, amount_cents = ?, memo = ?
            WHERE id = ?
        `, [input.transactionDate, input.accountName, input.amountCents, input.memo || null, id]);
        if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
        return getTransactionByKey(key);
    }

    throw new Error("NOT_FOUND");
}

export async function deleteTransactionByKey(key: string) {
    await ensureInvoiceSchema();
    await ensureVendorBillPaymentSchema();

    if (key.startsWith("invoice-history-")) {
        throw new Error("HISTORICAL_TRANSACTION_READ_ONLY");
    }

    if (key.startsWith("invoice-")) {
        const id = Number(key.replace("invoice-", ""));
        if (!Number.isInteger(id) || id <= 0) throw new Error("NOT_FOUND");

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [payments] = await connection.query<RowDataPacket[]>(`
                SELECT p.id, p.invoice_id, p.amount_cents, i.total_cents, i.amount_paid_cents
                FROM invoice_payments p
                JOIN invoices i ON i.id = p.invoice_id
                WHERE p.id = ?
                FOR UPDATE
            `, [id]);
            const payment = payments[0];
            if (!payment) throw new Error("NOT_FOUND");

            const nextPaid = Math.max(0, Number(payment.amount_paid_cents || 0) - Number(payment.amount_cents || 0));
            const total = Number(payment.total_cents || 0);
            const nextStatus = nextPaid <= 0 ? "sent" : nextPaid >= total ? "paid" : "partially_paid";

            await connection.execute(`DELETE FROM invoice_payments WHERE id = ?`, [id]);
            await connection.execute(`UPDATE invoices SET amount_paid_cents = ?, status = ? WHERE id = ?`, [nextPaid, nextStatus, payment.invoice_id]);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    if (key.startsWith("bill-")) {
        const id = Number(key.replace("bill-", ""));
        if (!Number.isInteger(id) || id <= 0) throw new Error("NOT_FOUND");

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [payments] = await connection.query<RowDataPacket[]>(`
                SELECT bp.id, bp.bill_id, bp.amount_cents, b.total_cents, b.amount_paid_cents
                FROM vendor_bill_payments bp
                JOIN vendor_bills b ON b.id = bp.bill_id
                WHERE bp.id = ?
                FOR UPDATE
            `, [id]);
            const payment = payments[0];
            if (!payment) throw new Error("NOT_FOUND");

            const nextPaid = Math.max(0, Number(payment.amount_paid_cents || 0) - Number(payment.amount_cents || 0));
            const total = Number(payment.total_cents || 0);
            const nextStatus = nextPaid <= 0 ? "unpaid" : nextPaid >= total ? "paid" : "partially_paid";

            await connection.execute(`DELETE FROM vendor_bill_payments WHERE id = ?`, [id]);
            await connection.execute(`UPDATE vendor_bills SET amount_paid_cents = ?, status = ? WHERE id = ?`, [nextPaid, nextStatus, payment.bill_id]);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    throw new Error("NOT_FOUND");
}
