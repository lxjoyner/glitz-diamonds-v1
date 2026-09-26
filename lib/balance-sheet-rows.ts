import type { BalanceSheetReport } from "@/lib/invoices-donations-balance-sheet";

export type BalanceSheetExportRow = {
    label: string;
    amount: number | null;
    level: number;
    informational?: boolean;
};
export function balanceSheetRows(report: BalanceSheetReport, detail: boolean): BalanceSheetExportRow[] {
    if (detail) return [
        { label: "Invoices & Donations", amount: null, level: 0 },
        { label: "Cash and Bank", amount: null, level: 1 },
        { label: "Cash on Hand*", amount: report.hasVerifiedCashBalance ? report.cashOnHandCents : null, level: 2 },
        { label: "Total Cash and Bank*", amount: report.cashOnHandCents, level: 1 },
        { label: "Other Invoices & Donations", amount: null, level: 1 },
        { label: "Accounts Receivable", amount: report.accountsReceivableCents, level: 2 },
        { label: "Past Due Payments (included in receivables)", amount: report.pastDueCents, level: 2, informational: true },
        { label: "Total Current Invoices & Donations", amount: report.accountsReceivableCents, level: 1 },
        { label: "Total Invoices and Donations", amount: report.hasVerifiedCashBalance ? report.totalInvoicesDonationsCents : null, level: 0 },
    ];
    return [
        { label: "Invoices & Donations", amount: null, level: 0 },
        { label: "Total Cash and Bank*", amount: report.cashOnHandCents, level: 1 },
        { label: "Total Past Due Payments", amount: report.pastDueCents, level: 1, informational: true },
        ...(report.currentReceivablesCents > 0
            ? [{ label: "Invoices Not Yet Due", amount: report.currentReceivablesCents, level: 1, informational: true }]
            : []),
        { label: "Total Invoices and Donations", amount: report.totalInvoicesDonationsCents, level: 0 },
    ];
}
