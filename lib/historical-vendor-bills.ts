import crypto from "node:crypto";
import pool from "@/lib/db";
import { ensureVendorBillPaymentSchema } from "@/lib/vendor-db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type HistoricalBillInput = {
    vendorName: string;
    billDate: string;
    dueDate: string;
    amount: string | number;
    amountPaid?: string | number;
    status: "paid" | "unpaid" | "partially_paid";
    billNumber?: string;
    notes?: string;
};

type ExistingVendor = RowDataPacket & { id: number; vendor_name: string };
type ExistingBill = RowDataPacket & {
    id: number; vendor_id: number; vendor_name: string;
    bill_date: string; due_date: string; bill_number: string | null; total_cents: number;
};
type NormalizedBill = {
    vendorName: string; vendorKey: string; billDate: string; dueDate: string;
    totalCents: number; paidCents: number;
    status: "paid" | "unpaid" | "partially_paid"; billNumber: string; notes: string;
    fingerprint: string;
};
export type BillPreview = {
    row: number; vendorName: string; billDate: string; dueDate: string;
    totalCents: number; paidCents: number; status: string; billNumber: string;
    vendorAction: "create" | "reuse" | "ambiguous" | "invalid";
    matchedVendorId: number | null; duplicate: boolean; duplicateBillId: number | null;
    issue: string | null;
};

export function normalizeVendorName(value: string) {
    return value.normalize("NFKC").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}
function parseMoney(value: unknown): number | null {
    const txt = String(value ?? "").trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(txt)) return null;
    const cents = Math.round(Number(txt) * 100);
    return Number.isSafeInteger(cents) ? cents : null;
}
function validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00.000Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function normalizeBill(input: HistoricalBillInput) {
    const vendorName = String(input.vendorName || "").trim().replace(/\s+/g, " ");
    const vendorKey = normalizeVendorName(vendorName);
    const billDate = String(input.billDate || "").trim();
    const dueDate = String(input.dueDate || "").trim();
    const billNumber = String(input.billNumber || "").trim();
    const notes = String(input.notes || "").trim();
    const totalCents = parseMoney(input.amount);
    const status = input.status;
    const suppliedPaid = String(input.amountPaid ?? "").trim() !== "";
    const paidCents = status === "paid" && !suppliedPaid ? totalCents :
        status === "unpaid" && !suppliedPaid ? 0 : parseMoney(input.amountPaid);

    let issue: string | null = null;
    if (!vendorName || !vendorKey || vendorName.length > 180) issue = "Vendor name required (up to 180 characters).";
    else if (!validDate(billDate) || !validDate(dueDate)) issue = "Valid bill and due dates required (YYYY-MM-DD).";
    else if (totalCents === null || totalCents <= 0) issue = "Confirm a positive amount; the $0.00 screenshot row needs review.";
    else if (!["paid", "unpaid", "partially_paid"].includes(status)) issue = "Choose a valid payment status.";
    else if (paidCents === null || paidCents < 0 || paidCents > totalCents) issue = "Paid amount must be between $0 and total.";
    else if (status === "paid" && paidCents !== totalCents) issue = "Paid bill must be fully paid.";
    else if (status === "unpaid" && paidCents !== 0) issue = "Unpaid bill must have no payment.";
    else if (status === "partially_paid" && (paidCents === 0 || paidCents === totalCents)) issue = "Partial payment must be greater than $0 but less than total.";
    else if (billNumber.length > 120 || notes.length > 4500) issue = "Bill number or notes too long.";

    // Identical same-day bills require separate source bill numbers to distinguish.
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify([
        vendorKey, billDate, dueDate, totalCents, billNumber.toLowerCase(),
    ])).digest("hex");
    const bill: NormalizedBill = {
        vendorName, vendorKey, billDate, dueDate, totalCents: totalCents || 0,
        paidCents: paidCents || 0, status, billNumber, notes, fingerprint,
    };
    return { bill, issue };
}

async function ensureImportSchema() {
    await ensureVendorBillPaymentSchema();
    await pool.query(`CREATE TABLE IF NOT EXISTS historical_vendor_bill_imports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        fingerprint CHAR(64) NOT NULL UNIQUE,
        vendor_bill_id BIGINT NOT NULL,
        source VARCHAR(120) NOT NULL DEFAULT 'Historical screenshot import',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_historical_vendor_bill (vendor_bill_id),
        CONSTRAINT fk_historical_vendor_bill FOREIGN KEY (vendor_bill_id)
            REFERENCES vendor_bills(id) ON DELETE CASCADE
    )`);
}
async function existingData(connection?: PoolConnection) {
    const db = connection || pool;
    const [vendors] = await db.query<ExistingVendor[]>("SELECT id, vendor_name FROM vendors ORDER BY id");
    const [bills] = await db.query<ExistingBill[]>(`
        SELECT b.id, b.vendor_id, v.vendor_name,
            DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS bill_date,
            DATE_FORMAT(b.due_date, '%Y-%m-%d') AS due_date,
            b.bill_number, b.total_cents
        FROM vendor_bills b JOIN vendors v ON v.id = b.vendor_id
    `);
    return { vendors, bills };
}
function sameBill(row: NormalizedBill, bill: ExistingBill) {
    return row.vendorKey === normalizeVendorName(bill.vendor_name)
        && row.billDate === bill.bill_date && row.dueDate === bill.due_date
        && row.totalCents === Number(bill.total_cents)
        && row.billNumber.toLowerCase() === String(bill.bill_number || "").trim().toLowerCase();
}
function makePreview(inputs: HistoricalBillInput[], existing: Awaited<ReturnType<typeof existingData>>) {
    const byName = new Map<string, ExistingVendor[]>();
    for (const vendor of existing.vendors) {
        const key = normalizeVendorName(vendor.vendor_name);
        byName.set(key, [...(byName.get(key) || []), vendor]);
    }
    const seen = new Set<string>();
    const rows: BillPreview[] = inputs.map((input, index) => {
        const { bill, issue: invalid } = normalizeBill(input);
        const matches = byName.get(bill.vendorKey) || [];
        const duplicateBill = existing.bills.find((current) => sameBill(bill, current));
        const repeated = seen.has(bill.fingerprint);
        seen.add(bill.fingerprint);
        const vendorAction = !bill.vendorKey ? "invalid" :
            matches.length > 1 ? "ambiguous" : matches.length === 1 ? "reuse" : "create";
        const issue = invalid ||
            (matches.length > 1 ? "Several existing vendors normalize to this name; resolve them first." : null) ||
            (duplicateBill ? "Possible existing bill duplicate. Verify or supply a distinct bill number." : null) ||
            (repeated ? "Duplicate row in this batch. Verify or supply a distinct bill number." : null);
        return {
            row: index + 1, vendorName: bill.vendorName,
            billDate: bill.billDate, dueDate: bill.dueDate,
            totalCents: bill.totalCents, paidCents: bill.paidCents,
            status: bill.status, billNumber: bill.billNumber,
            vendorAction, matchedVendorId: matches.length === 1 ? matches[0].id : null,
            duplicate: Boolean(duplicateBill || repeated), duplicateBillId: duplicateBill?.id || null, issue,
        } as BillPreview;
    });
    const plans = new Map<string, { name: string; action: string; existingId: number | null }>();
    rows.forEach((row) => {
        const key = normalizeVendorName(row.vendorName);
        if (key && row.vendorAction !== "invalid") plans.set(key, {
            name: row.vendorName, action: row.vendorAction, existingId: row.matchedVendorId,
        });
    });
    return { rows, vendors: [...plans.values()] };
}
export async function previewHistoricalBills(inputs: HistoricalBillInput[]) {
    await ensureImportSchema();
    const preview = makePreview(inputs, await existingData());
    return {
        ...preview,
        readyCount: preview.rows.filter((row) => !row.issue).length,
        paidCents: preview.rows.filter((row) => !row.issue).reduce((sum, row) => sum + row.paidCents, 0),
        totalCents: preview.rows.filter((row) => !row.issue).reduce((sum, row) => sum + row.totalCents, 0),
    };
}
export async function importHistoricalBills(inputs: HistoricalBillInput[]) {
    await ensureImportSchema();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Re-evaluate preview inside a transaction, locking existing records.
        await connection.query("SELECT id FROM vendors FOR UPDATE");
        await connection.query("SELECT id FROM vendor_bills FOR UPDATE");
        const preview = makePreview(inputs, await existingData(connection));
        if (preview.rows.some((row) => row.issue)) throw new Error("REVIEW_REQUIRED");

        const vendorMap = new Map<string, number>();
        for (const vendor of preview.vendors) {
            if (vendor.action === "reuse" && vendor.existingId) {
                vendorMap.set(normalizeVendorName(vendor.name), vendor.existingId);
            } else {
                const [inserted] = await connection.execute<ResultSetHeader>(
                    "INSERT INTO vendors (vendor_name, vendor_type, currency) VALUES (?, 'regular', 'USD')",
                    [vendor.name]
                );
                vendorMap.set(normalizeVendorName(vendor.name), inserted.insertId);
            }
        }
        const imported: Array<{ billId: number; vendorName: string; totalCents: number }> = [];
        for (const raw of inputs) {
            const { bill } = normalizeBill(raw);
            const vendorId = vendorMap.get(bill.vendorKey);
            if (!vendorId) throw new Error("VENDOR_NOT_FOUND");
            const [created] = await connection.execute<ResultSetHeader>(`
                INSERT INTO vendor_bills (
                    vendor_id, bill_date, due_date, bill_number, notes, currency,
                    subtotal_cents, total_tax_cents, total_cents, amount_paid_cents, status
                ) VALUES (?, ?, ?, ?, ?, 'USD', ?, 0, ?, ?, ?)
            `, [
                vendorId, bill.billDate, bill.dueDate, bill.billNumber || null,
                ["Historical bill imported from screenshot. Actual payment date, method and account not provided.",
                    bill.notes].filter(Boolean).join("\n"),
                bill.totalCents, bill.totalCents, bill.paidCents, bill.status,
            ]);
            await connection.execute(`
                INSERT INTO vendor_bill_lines (
                    bill_id, item, expense_category, description, quantity,
                    price_cents, tax_cents, amount_cents, sort_order
                ) VALUES (?, ?, ?, ?, 1, ?, 0, ?, 0)
            `, [
                created.insertId, "Historical bill", "Historical expenses",
                bill.vendorName + " - imported historical bill",
                bill.totalCents, bill.totalCents,
            ]);
            await connection.execute(`
                INSERT INTO historical_vendor_bill_imports (fingerprint, vendor_bill_id) VALUES (?, ?)
            `, [bill.fingerprint, created.insertId]);
            imported.push({ billId: created.insertId, vendorName: bill.vendorName, totalCents: bill.totalCents });
        }
        await connection.commit();
        return { imported, newVendors: preview.vendors.filter((v) => v.action === "create").length };
    } catch (error) {
        await connection.rollback();
        if (error instanceof Error && (error.message === "REVIEW_REQUIRED" ||
            error.message.includes("Duplicate entry"))) throw new Error("REVIEW_REQUIRED");
        throw error;
    } finally {
        connection.release();
    }
}
