import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { ensureInvoiceSchema } from "@/lib/invoice-db";

/**
 * A balance summary for one member, at a specific invoice/send date.
 * The source is the same invoices and recorded paid amounts used by
 * Account Transactions, but this uses each invoice's outstanding balance
 * directly to avoid reapplying already-credited payments.
 */
export type OverdueInvoiceRow = {
    year: number;
    month: number;
    amountDueCents: number;
};

export type OverdueInvoiceSummary = {
    rows: OverdueInvoiceRow[];
    totalCents: number;
    asOfDate: string;
};

export async function getMemberOverdueInvoiceSummary(
    memberId: number,
    asOfDate: string,
    excludeInvoiceId?: number
): Promise<OverdueInvoiceSummary> {
    if (!Number.isSafeInteger(memberId) || memberId <= 0) throw new Error("INVALID_MEMBER");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) ||
        Number.isNaN(Date.parse(asOfDate + "T00:00:00Z"))) throw new Error("INVALID_DATE");
    await ensureInvoiceSchema();

    const [rows] = await pool.query<(RowDataPacket & {
        year: number;
        month: number;
        amount_due_cents: string | number;
    })[]>(`
        SELECT YEAR(i.due_date) AS year,
               MONTH(i.due_date) AS month,
               SUM(GREATEST(0, i.total_cents - i.amount_paid_cents)) AS amount_due_cents
        FROM invoices i
        WHERE i.member_id = ?
          AND i.id <> ?
          AND i.due_date < ?
          AND i.status NOT IN ('draft', 'void')
          AND i.total_cents > i.amount_paid_cents
        GROUP BY YEAR(i.due_date), MONTH(i.due_date)
        ORDER BY YEAR(i.due_date), MONTH(i.due_date)
    `, [memberId, excludeInvoiceId ?? 0, asOfDate]);

    const resultRows = rows.map((row) => ({
        year: Number(row.year),
        month: Number(row.month),
        amountDueCents: Number(row.amount_due_cents),
    }));
    return {
        rows: resultRows,
        totalCents: resultRows.reduce((sum, row) => sum + row.amountDueCents, 0),
        asOfDate,
    };
}
