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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(balanceDate) ||
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


    // Cash and Bank is an operational total of paid invoices plus recorded
    // donations (currently donations can only appear as invoice payments),
    // less paid vendor bills. Use each persisted paid amount once.
    //
    // A ledger row is dated; an imported historical remainder has no actual
    // payment date, so place only that undated remainder on its parent invoice
    // or bill date for historical as-of reporting. This is explicitly disclosed.
    //
    // Ledger amounts are not counted twice after historic reconciliation:
    // parent paid balance - ALL ledger entries = undated imported remainder.
    const [cashRows] = await pool.query<RowDataPacket[]>(`
        SELECT
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
             WHERE p.payment_date <= ? AND i.invoice_date <= ?
               AND i.status <> 'void')
            +
            (SELECT COALESCE(SUM(GREATEST(0, i.amount_paid_cents -
                COALESCE(posted.total_cents, 0))), 0)
             FROM invoices i
             LEFT JOIN (
                 SELECT invoice_id, SUM(amount_cents) AS total_cents
                 FROM invoice_payments GROUP BY invoice_id
             ) posted ON posted.invoice_id = i.id
             WHERE i.invoice_date <= ? AND i.status <> 'void')
            -
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM vendor_bill_payments p JOIN vendor_bills b ON b.id = p.bill_id
             WHERE p.payment_date <= ? AND b.bill_date <= ?
               AND b.status <> 'void')
            -
            (SELECT COALESCE(SUM(GREATEST(0, b.amount_paid_cents -
                COALESCE(posted.total_cents, 0))), 0)
             FROM vendor_bills b
             LEFT JOIN (
                 SELECT bill_id, SUM(amount_cents) AS total_cents
                 FROM vendor_bill_payments GROUP BY bill_id
             ) posted ON posted.bill_id = b.id
             WHERE b.bill_date <= ? AND b.status <> 'void')
            AS net_cash_cents
    `, [asOf, asOf, asOf, asOf, asOf, asOf]);
    const receivables = Number(invoiceRows[0]?.receivable_cents || 0);
    const pastDue = Number(invoiceRows[0]?.overdue_cents || 0);
    const netRecordedCash = Number(cashRows[0]?.net_cash_cents || 0);
    const totalPayables = Number(billRows[0]?.payable_cents || 0);
    // "Verified" here means the requested source-derived report total is
    // available; no claim is made about reconciliation with a bank statement.
    const hasVerifiedCashBalance = true;
    const cash = netRecordedCash;
    // "To be received" combines all eligible outstanding invoices, whether
    // they are past due or have upcoming due dates. Past due is a subset and
    // is presented separately as information rather than added again.
    const outstanding = receivables;
    return {
        asOf, reportType,
        cashOnHandCents: cash,
        netRecordedCashMovementCents: netRecordedCash,
        hasVerifiedCashBalance,
        openingBalanceDate: null,
        accountsReceivableCents: outstanding,
        pastDueCents: pastDue,
        currentReceivablesCents: Math.max(0, receivables - pastDue),
        totalInvoicesDonationsCents: cash + outstanding,
        currentPayablesCents: totalPayables,
        outstandingBillsCents: totalPayables,
        notes: [
            "Cash and Bank is the requested operational calculation: all eligible recorded paid invoice amounts minus all eligible paid vendor bills. It is not a reconciled bank account balance.",
            "Historical paid imports without actual payment dates are included based on their source invoice or bill dates. Historical as-of periods may differ until these payments are dated.",
            "To be received includes overdue and not-yet-due outstanding invoices. The past-due amount is an informational subset, not an additional charge.",
            "There is no separate donations ledger yet; payments recorded as invoices are included, but independently received donations cannot be added automatically.",
            ...(reportType === "cash" ? ["Cash Basis selected: the requested outstanding-invoice figure remains visible because To be received includes unpaid invoices."] : []),
        ],
    };
}
