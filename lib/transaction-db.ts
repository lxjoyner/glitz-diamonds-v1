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
