import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { listInvoicePaymentAccounts } from "@/lib/invoice-db";
import { ensureVendorBillPaymentSchema } from "@/lib/vendor-db";
import { ensureTransactionEditSchema, getTransactionByKey } from "@/lib/transaction-db";

export type TransactionEditInput = {
    transactionDate: string;
    description: string;
    accountName: string;
    category: string;
    transactionType: "Deposit" | "Withdrawal";
    amountCents: number;
    memo: string;
    dateVerified?: boolean;
};

export async function getTransactionAccounts() {
    const options = await listInvoicePaymentAccounts();
    const names = options.map((option) => String(option.name));
    if (!names.includes("Cash on Hand")) names.unshift("Cash on Hand");
    return names;
}

export async function getTransactionForEdit(key: string) {
    const row = await getTransactionByKey(key);
    if (!row) return null;
    await ensureTransactionEditSchema();
    const [edits] = await pool.query<RowDataPacket[]>(
        "SELECT description, category, transaction_type FROM transaction_edit_details WHERE transaction_key = ?",
        [key]
    );
    return {
        ...row,
        description: edits[0]?.description ?? row.description,
        category: edits[0]?.category ?? row.category,
        transaction_type: edits[0]?.transaction_type ?? (row.direction === "income" ? "Deposit" : "Withdrawal"),
        historical_needs_verification: key.startsWith("bill-history-"),
    };
}

function validate(input: TransactionEditInput, direction: "income" | "expense") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)
        || Number.isNaN(Date.parse(input.transactionDate + "T00:00:00Z"))) {
        throw new Error("INVALID_DATE");
    }
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) throw new Error("INVALID_AMOUNT");
    if (!input.description.trim() || input.description.length > 500
        || !input.category.trim() || input.category.length > 500 || input.memo.length > 500) {
        throw new Error("INVALID_DETAILS");
    }
    if (input.transactionType !== (direction === "income" ? "Deposit" : "Withdrawal")) {
        // Reclassifying a vendor bill payment as income (or vice versa) requires
        // a separate reversing entry, not merely changing a form label.
        throw new Error("SOURCE_TYPE_CONFLICT");
    }
}

export async function saveTransactionEdit(key: string, input: TransactionEditInput) {
    await ensureVendorBillPaymentSchema();
    await ensureTransactionEditSchema();
    const row = await getTransactionByKey(key);
    if (!row) throw new Error("NOT_FOUND");
    validate(input, row.direction);
    if (!(await getTransactionAccounts()).includes(input.accountName)) throw new Error("INVALID_ACCOUNT");
    if (key.startsWith("invoice-history-")) throw new Error("HISTORICAL_INVOICE_READ_ONLY");

    if (key.startsWith("bill-history-")) {
        if (!input.dateVerified) throw new Error("VERIFY_HISTORICAL_DATE");
        const billId = Number(key.slice("bill-history-".length));
        if (!Number.isSafeInteger(billId) || billId <= 0) throw new Error("NOT_FOUND");
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [bills] = await connection.query<RowDataPacket[]>(
                "SELECT id, vendor_id, amount_paid_cents, total_cents FROM vendor_bills WHERE id = ? FOR UPDATE",
                [billId]
            );
            const bill = bills[0];
            if (!bill) throw new Error("NOT_FOUND");
            const [posted] = await connection.query<RowDataPacket[]>(
                "SELECT COALESCE(SUM(amount_cents), 0) AS posted_cents FROM vendor_bill_payments WHERE bill_id = ?",
                [billId]
            );
            const itemized = Number(posted[0].posted_cents || 0);
            const remainder = Number(bill.amount_paid_cents) - itemized;
            if (remainder <= 0) throw new Error("ALREADY_RECONCILED");
            const newPaid = itemized + input.amountCents;
            if (newPaid > Number(bill.total_cents)) throw new Error("AMOUNT_EXCEEDS_BILL");
            const [created] = await connection.execute<ResultSetHeader>(
                `INSERT INTO vendor_bill_payments
                    (bill_id, vendor_id, payment_date, amount_cents, method, account_name, memo)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [billId, bill.vendor_id, input.transactionDate, input.amountCents,
                    "Historical payment (reconciled)", input.accountName, input.memo || null]
            );
            const nextStatus = newPaid === Number(bill.total_cents)
                ? "paid" : newPaid > 0 ? "partially_paid" : "unpaid";
            await connection.execute(
                "UPDATE vendor_bills SET amount_paid_cents = ?, status = ? WHERE id = ?",
                [newPaid, nextStatus, billId]
            );
            const newKey = "bill-" + created.insertId;
            await connection.execute(
                `INSERT INTO transaction_edit_details (transaction_key, description, category, transaction_type)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE description = VALUES(description),
                    category = VALUES(category), transaction_type = VALUES(transaction_type)`,
                [newKey, input.description.trim(), input.category.trim(), input.transactionType]
            );
            // A receipt uploaded before reconciliation follows the newly created
            // ledger entry. The receipt table exists only after the first upload.
            const [tables] = await connection.query<RowDataPacket[]>(
                "SHOW TABLES LIKE 'transaction_receipts'"
            );
            if (tables.length > 0) {
                await connection.execute(
                    "UPDATE transaction_receipts SET transaction_key = ? WHERE transaction_key = ?",
                    [newKey, key]
                );
            }
            await connection.commit();
            return { transactionKey: newKey, amountPaidCents: newPaid };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Regular ledger payment rows remain tied to their source invoice or bill.
    // Payment amount edits also update source paid balances in the same transaction.
    const source = key.startsWith("bill-") ? "bill"
        : key.startsWith("invoice-") ? "invoice" : null;
    if (!source) throw new Error("NOT_FOUND");
    const paymentId = Number(key.slice(source.length + 1));
    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) throw new Error("NOT_FOUND");

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        if (source === "bill") {
            const [ids] = await connection.query<RowDataPacket[]>(
                "SELECT bill_id FROM vendor_bill_payments WHERE id = ?", [paymentId]
            );
            if (!ids[0]) throw new Error("NOT_FOUND");
            const [bills] = await connection.query<RowDataPacket[]>(
                "SELECT id, total_cents, amount_paid_cents FROM vendor_bills WHERE id = ? FOR UPDATE",
                [ids[0].bill_id]
            );
            const [payments] = await connection.query<RowDataPacket[]>(
                "SELECT amount_cents FROM vendor_bill_payments WHERE id = ? FOR UPDATE", [paymentId]
            );
            if (!bills[0] || !payments[0]) throw new Error("NOT_FOUND");
            const newPaid = Number(bills[0].amount_paid_cents)
                - Number(payments[0].amount_cents) + input.amountCents;
            if (newPaid < 0 || newPaid > Number(bills[0].total_cents)) throw new Error("AMOUNT_EXCEEDS_BILL");
            const nextStatus = newPaid >= Number(bills[0].total_cents)
                ? "paid" : newPaid > 0 ? "partially_paid" : "unpaid";
            await connection.execute(
                "UPDATE vendor_bill_payments SET payment_date = ?, amount_cents = ?, account_name = ?, memo = ? WHERE id = ?",
                [input.transactionDate, input.amountCents, input.accountName, input.memo || null, paymentId]
            );
            await connection.execute(
                "UPDATE vendor_bills SET amount_paid_cents = ?, status = ? WHERE id = ?",
                [newPaid, nextStatus, bills[0].id]
            );
        } else {
            const [ids] = await connection.query<RowDataPacket[]>(
                "SELECT invoice_id FROM invoice_payments WHERE id = ?", [paymentId]
            );
            if (!ids[0]) throw new Error("NOT_FOUND");
            const [invoices] = await connection.query<RowDataPacket[]>(
                "SELECT id, total_cents, amount_paid_cents FROM invoices WHERE id = ? FOR UPDATE",
                [ids[0].invoice_id]
            );
            const [payments] = await connection.query<RowDataPacket[]>(
                "SELECT amount_cents FROM invoice_payments WHERE id = ? FOR UPDATE", [paymentId]
            );
            if (!invoices[0] || !payments[0]) throw new Error("NOT_FOUND");
            const newPaid = Number(invoices[0].amount_paid_cents)
                - Number(payments[0].amount_cents) + input.amountCents;
            if (newPaid < 0 || newPaid > Number(invoices[0].total_cents)) throw new Error("AMOUNT_EXCEEDS_BILL");
            const nextStatus = newPaid >= Number(invoices[0].total_cents)
                ? "paid" : newPaid > 0 ? "partially_paid" : "sent";
            await connection.execute(
                "UPDATE invoice_payments SET payment_date = ?, amount_cents = ?, account_name = ?, memo = ? WHERE id = ?",
                [input.transactionDate, input.amountCents, input.accountName, input.memo || null, paymentId]
            );
            await connection.execute(
                "UPDATE invoices SET amount_paid_cents = ?, status = ? WHERE id = ?",
                [newPaid, nextStatus, invoices[0].id]
            );
        }
        await connection.execute(
            `INSERT INTO transaction_edit_details (transaction_key, description, category, transaction_type)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE description = VALUES(description),
                category = VALUES(category), transaction_type = VALUES(transaction_type)`,
            [key, input.description.trim(), input.category.trim(), input.transactionType]
        );
        await connection.commit();
        return { transactionKey: key };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
