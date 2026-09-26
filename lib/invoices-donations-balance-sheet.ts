import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { ensureInvoiceSchema } from "@/lib/invoice-db";
import { ensureVendorBillPaymentSchema } from "@/lib/vendor-db";

export type BalanceSheetType = "accrual" | "cash";
export type BalanceSheetReport = {
    asOf: string;
    reportType: BalanceSheetType;
    cashOnHandCents: number;
    accountsReceivableCents: number;
    pastDueCents: number;
    currentReceivablesCents: number;
    netRecordedCashMovementCents: number;
    hasVerifiedCashBalance: boolean;
    openingBalanceDate: string | null;
    totalInvoicesDonationsCents: number;
    currentPayablesCents: number;
    outstandingBillsCents: number;
    notes: string[];
};

/**
 * This is an Invoices & Donations operational statement, not a conventional
 * GAAP balance sheet: no general ledger, opening bank balances, separate
 * donations ledger, or full expense allocations exist in this application.
 * We do not manufacture a balancing Equity or Cash number.
 */
/** A user-entered, reconciled starting Cash + Bank total.
 * This is deliberately optional; imported bills/invoices lack complete
 * historical dated payments so the report cannot invent opening balances.
 */
export async function ensureBalanceSheetOpeningSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS balance_sheet_cash_opening (
            id INT PRIMARY KEY,
            balance_date DATE NOT NULL,
            opening_cents BIGINT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}
export async function getBalanceSheetOpening() {
    await ensureBalanceSheetOpeningSchema();
    const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT DATE_FORMAT(balance_date, '%Y-%m-%d') AS balanceDate, opening_cents AS openingCents FROM balance_sheet_cash_opening WHERE id = 1"
    );
    return rows[0] ? { balanceDate: String(rows[0].balanceDate), openingCents: Number(rows[0].openingCents) } : null;
}
export async function saveBalanceSheetOpening(balanceDate: string, openingCents: number) {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(balanceDate) ||
        !Number.isFinite(Date.parse(balanceDate + "T00:00:00Z")) ||
        new Date(balanceDate + "T00:00:00Z").toISOString().slice(0,10) !== balanceDate ||
        !Number.isSafeInteger(openingCents) || openingCents < 0) throw new Error("INVALID_OPENING");
    await ensureBalanceSheetOpeningSchema();
    await pool.execute(
        `INSERT INTO balance_sheet_cash_opening (id,balance_date,opening_cents) VALUES (1,?,?)
         ON DUPLICATE KEY UPDATE balance_date=VALUES(balance_date),opening_cents=VALUES(opening_cents)`,
        [balanceDate,openingCents]
    );
}

export async function getInvoicesDonationsBalanceSheet(
    asOf: string, reportType: BalanceSheetType
): Promise<BalanceSheetReport> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(asOf + "T00:00:00Z")) ||
        new Date(asOf + "T00:00:00Z").toISOString().slice(0, 10) !== asOf) throw new Error("INVALID_DATE");
    if (reportType !== "accrual" && reportType !== "cash") throw new Error("INVALID_REPORT_TYPE");
    await ensureInvoiceSchema();
    await ensureVendorBillPaymentSchema();
    const opening = await getBalanceSheetOpening();

    // Invoice outstanding is aggregated at the report date using the actual
    // payment dates when they exist. Historic paid amounts without transaction
    // dates cannot be timed precisely, so use the known imported balance as
    // recorded and disclose this limitation in the report.
    const [invoiceRows] = await pool.query<RowDataPacket[]>(`
        SELECT
            COALESCE(SUM(GREATEST(0, i.total_cents -
                COALESCE(ledger.paid_through_cents, 0) -
                GREATEST(0, i.amount_paid_cents - COALESCE(ledger.all_recorded_cents, 0))
            )), 0) AS receivable_cents,
            COALESCE(SUM(IF(i.due_date < ?,
                GREATEST(0, i.total_cents -
                    COALESCE(ledger.paid_through_cents, 0) -
                    GREATEST(0, i.amount_paid_cents - COALESCE(ledger.all_recorded_cents, 0))
                ), 0)), 0) AS overdue_cents
        FROM invoices i
        LEFT JOIN (
            SELECT p.invoice_id,
                SUM(IF(p.payment_date <= ?, p.amount_cents, 0)) AS paid_through_cents,
                SUM(p.amount_cents) AS all_recorded_cents
            FROM invoice_payments p GROUP BY p.invoice_id
        ) ledger ON ledger.invoice_id = i.id
        WHERE i.invoice_date <= ? AND i.status <> 'void'
          AND (i.status <> 'draft' OR i.sent_at IS NOT NULL)
    `, [asOf, asOf, asOf]);

    const [billRows] = await pool.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(GREATEST(0, b.total_cents -
            COALESCE(paid.paid_through_cents, 0) -
            GREATEST(0, b.amount_paid_cents - COALESCE(paid.all_recorded_cents, 0))
        )), 0) AS payable_cents
        FROM vendor_bills b
        LEFT JOIN (
            SELECT p.bill_id,
                SUM(IF(p.payment_date <= ?, p.amount_cents, 0)) AS paid_through_cents,
                SUM(p.amount_cents) AS all_recorded_cents
            FROM vendor_bill_payments p GROUP BY p.bill_id
        ) paid ON paid.bill_id = b.id
        WHERE b.bill_date <= ? AND b.status <> 'void'
    `, [asOf, asOf]);

    // Cash ledger = recorded dated invoice inflows minus dated vendor bill
    // outflows. Historic imported paid values are NOT booked as dated cash.
    // Without opening account balances this is *net recorded cash movement*,
    // NOT Cash on Hand. Keep it separately labeled as a disclosed metric.
    const [cashRows] = await pool.query<RowDataPacket[]>(`
        SELECT
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
             WHERE p.payment_date > ? AND p.payment_date <= ? AND i.status <> 'void')
            -
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM vendor_bill_payments p JOIN vendor_bills b ON b.id = p.bill_id
             WHERE p.payment_date > ? AND p.payment_date <= ? AND b.status <> 'void')
            AS net_cash_cents
    `, [opening?.balanceDate ?? "1000-01-01", asOf,
        opening?.balanceDate ?? "1000-01-01", asOf]);

    const receivables = Number(invoiceRows[0]?.receivable_cents || 0);
    const pastDue = Number(invoiceRows[0]?.overdue_cents || 0);
    const netRecordedCash = Number(cashRows[0]?.net_cash_cents || 0);
    const totalPayables = Number(billRows[0]?.payable_cents || 0);
    // The opening represents the close of that day, so only subsequent
    // dated activity is added. If no opening exists or the report date is
    // earlier, no calculated Cash + Bank total is asserted.
    const hasVerifiedCashBalance = Boolean(opening && opening.balanceDate <= asOf);
    const cash = hasVerifiedCashBalance ? Number(opening?.openingCents || 0) + netRecordedCash : 0;
    const outstanding = reportType === "accrual" ? receivables : 0;
    return {
        asOf, reportType,
        cashOnHandCents: cash,
        netRecordedCashMovementCents: netRecordedCash,
        hasVerifiedCashBalance,
        openingBalanceDate: opening?.balanceDate ?? null,
        accountsReceivableCents: outstanding,
        pastDueCents: reportType === "accrual" ? pastDue : 0,
        currentReceivablesCents: reportType === "accrual" ? Math.max(0, receivables - pastDue) : 0,
        totalInvoicesDonationsCents: cash + outstanding,
        currentPayablesCents: totalPayables,
        outstandingBillsCents: totalPayables,
        notes: [
            hasVerifiedCashBalance
                ? "Cash and Bank is the entered closing balance dated " + opening?.balanceDate + " plus recorded in-app payments afterward. Verify all unrecorded outside activity separately."
                : "Cash and Bank and the combined grand total are unavailable until you enter a verified opening cash/bank balance. N/A does not mean zero.",
            "Historical imported payments without actual payment dates are applied using their stored balances. Prior-period results are therefore estimates until those dates are reconciled.",
            "Net recorded cash movement since the entered opening date (or all recorded dates if none is set) is informational. No bank connection or independent reconciliation is available.",
            "Donations are included only when recorded through existing invoice payments. No separate donations ledger currently exists.",
            ...(reportType === "cash" ? ["Cash Basis hides receivables; outstanding invoices remain available in Accrual."] : []),
        ],
    };
}
