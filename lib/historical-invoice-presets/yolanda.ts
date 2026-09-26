/**
 * Read-only transcription from four screenshots supplied by the administrator.
 * Legacy source list: 47 rows, all marked Paid, with zero amount due.
 *
 * Important:
 *   - Screenshots identify the list customer as "Yolanda"; the uploaded file
 *     names say "Yolanda D Joyner". Neither establishes the user's internal
 *     member_id. Admin MUST select/verify the existing member before preview.
 *   - Screenshots show invoice DATE but no DUE DATE. dueDate defaults to the
 *     visible invoice date solely to meet the existing import form contract;
 *     review/correct dates before import.
 *   - Actual payment dates, payment methods, and purposes are not provided.
 *     These are historical paid balances, not dated payment ledger events.
 *   - Labels "Recurring" are preserved only where visible in the images.
 */
export type HistoricalInvoicePresetRow = {
    oldInvoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    amount: string;
    amountPaid: string;
    status: "paid";
    recurring: boolean;
    description: string;
};

const screenshotRows: ReadonlyArray<readonly [date: string, legacyNumber: string, amount: string, recurring: boolean]> =
[
    [
        "2026-09-01",
        "426",
        "25.00",
        true
    ],
    [
        "2026-08-01",
        "417",
        "25.00",
        true
    ],
    [
        "2026-07-01",
        "411",
        "25.00",
        true
    ],
    [
        "2026-06-01",
        "403",
        "25.00",
        true
    ],
    [
        "2026-05-01",
        "392",
        "25.00",
        true
    ],
    [
        "2026-04-01",
        "382",
        "25.00",
        true
    ],
    [
        "2026-03-01",
        "374",
        "25.00",
        true
    ],
    [
        "2026-02-01",
        "366",
        "25.00",
        true
    ],
    [
        "2026-01-01",
        "355",
        "25.00",
        true
    ],
    [
        "2025-12-01",
        "345",
        "25.00",
        true
    ],
    [
        "2025-11-01",
        "338",
        "25.00",
        true
    ],
    [
        "2025-10-01",
        "330",
        "25.00",
        true
    ],
    [
        "2025-09-01",
        "317",
        "25.00",
        true
    ],
    [
        "2025-08-01",
        "311",
        "25.00",
        true
    ],
    [
        "2025-07-01",
        "302",
        "25.00",
        true
    ],
    [
        "2025-06-01",
        "291",
        "25.00",
        true
    ],
    [
        "2025-05-01",
        "282",
        "25.00",
        true
    ],
    [
        "2025-04-01",
        "277",
        "25.00",
        true
    ],
    [
        "2025-03-01",
        "266",
        "25.00",
        true
    ],
    [
        "2025-02-01",
        "259",
        "25.00",
        true
    ],
    [
        "2025-01-01",
        "248",
        "25.00",
        true
    ],
    [
        "2024-12-01",
        "239",
        "25.00",
        true
    ],
    [
        "2024-11-01",
        "230",
        "25.00",
        true
    ],
    [
        "2024-10-01",
        "218",
        "25.00",
        true
    ],
    [
        "2024-09-01",
        "213",
        "25.00",
        true
    ],
    [
        "2024-08-01",
        "205",
        "25.00",
        true
    ],
    [
        "2024-07-01",
        "192",
        "25.00",
        true
    ],
    [
        "2024-06-01",
        "183",
        "25.00",
        true
    ],
    [
        "2024-05-09",
        "180",
        "25.00",
        false
    ],
    [
        "2024-05-01",
        "172",
        "25.00",
        true
    ],
    [
        "2024-04-01",
        "162",
        "25.00",
        true
    ],
    [
        "2024-03-01",
        "152",
        "25.00",
        true
    ],
    [
        "2024-02-01",
        "144",
        "25.00",
        true
    ],
    [
        "2024-01-01",
        "131",
        "25.00",
        true
    ],
    [
        "2023-12-01",
        "121",
        "25.00",
        true
    ],
    [
        "2023-11-01",
        "110",
        "25.00",
        true
    ],
    [
        "2023-10-01",
        "106",
        "25.00",
        true
    ],
    [
        "2023-09-01",
        "97",
        "25.00",
        true
    ],
    [
        "2023-08-01",
        "84",
        "25.00",
        true
    ],
    [
        "2023-07-01",
        "77",
        "100.00",
        true
    ],
    [
        "2023-06-01",
        "59",
        "25.00",
        true
    ],
    [
        "2023-05-01",
        "5",
        "25.00",
        true
    ],
    [
        "2023-04-01",
        "26",
        "25.00",
        true
    ],
    [
        "2023-03-01",
        "25",
        "25.00",
        true
    ],
    [
        "2023-02-01",
        "24",
        "25.00",
        true
    ],
    [
        "2023-01-01",
        "27",
        "1000.00",
        false
    ],
    [
        "2023-01-01",
        "23",
        "25.00",
        false
    ]
];

export const YOLANDA_SOURCE_COUNT = 47;
export const YOLANDA_SOURCE_TOTAL_CENTS = 222500;

export function getYolandaInvoicePreset(): HistoricalInvoicePresetRow[] {
    return screenshotRows.map(([invoiceDate, oldInvoiceNumber, amount, recurring]) => ({
        oldInvoiceNumber,
        invoiceDate,
        // Source screenshots do not show due dates: admin should verify.
        dueDate: invoiceDate,
        amount,
        amountPaid: amount,
        status: "paid",
        recurring,
        description: recurring
            ? "Historical recurring invoice (item description not shown)"
            : "Historical invoice (item description not shown)",
    }));
}
