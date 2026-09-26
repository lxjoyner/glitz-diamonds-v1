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

    // Cash ledger = recorded dated invoice inflows minus dated vendor bill
    // outflows. Historic imported paid values are NOT booked as dated cash.
    // Without opening account balances this is *net recorded cash movement*
    // and must never be labeled a verified bank account closing balance.
    const [cashRows] = await pool.query<RowDataPacket[]>(`
        SELECT
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM invoice_payments p JOIN invoices i ON i.id = p.invoice_id
             WHERE p.payment_date <= ? AND i.status <> 'void')
            -
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM vendor_bill_payments p JOIN vendor_bills b ON b.id = p.bill_id
             WHERE p.payment_date <= ? AND b.status <> 'void')
            AS net_cash_cents
    `, [asOf, asOf]);

    const receivables = Number(invoiceRows[0]?.receivable_cents || 0);
    const pastDue = Number(invoiceRows[0]?.overdue_cents || 0);
    const netRecordedCash = Number(cashRows[0]?.net_cash_cents || 0);
    const totalPayables = Number(billRows[0]?.payable_cents || 0);
    const cash = netRecordedCash;
    const outstanding = reportType === "accrual" ? receivables : 0;
    return {
        asOf, reportType,
        cashOnHandCents: cash,
        accountsReceivableCents: outstanding,
        pastDueCents: reportType === "accrual" ? pastDue : 0,
        currentReceivablesCents: reportType === "accrual" ? Math.max(0, receivables - pastDue) : 0,
        totalInvoicesDonationsCents: cash + outstanding,
        currentPayablesCents: totalPayables,
        outstandingBillsCents: totalPayables,
        notes: [
            "Cash on Hand is net recorded cash movement, not a verified bank balance: opening balances, bank reconciliations and historical payments without dates are unavailable.",
            "Historical imported payments without actual payment dates are applied using their stored balances. Prior-period results are therefore estimates until those dates are reconciled.",
            "Donations are included only when recorded through existing invoice payments. No separate donations ledger currently exists.",
            ...(reportType === "cash" ? ["Cash Basis hides receivables; outstanding invoices remain available in Accrual."] : []),
        ],
    };
}
