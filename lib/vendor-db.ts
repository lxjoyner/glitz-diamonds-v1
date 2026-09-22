import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type VendorType = "regular" | "1099-nec";

export type VendorInput = {
    vendorName: string;
    vendorType: VendorType;
    firstName?: string;
    lastName?: string;
    currency?: string;
    email?: string;
    country?: string;
    provinceState?: string;
    address1?: string;
    address2?: string;
    city?: string;
    postalCode?: string;
    additionalInfo?: string;
};

export type VendorRow = RowDataPacket & {
    id: number;
    vendor_name: string;
    vendor_type: VendorType;
    first_name: string | null;
    last_name: string | null;
    currency: string;
    email: string | null;
    country: string | null;
    province_state: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    postal_code: string | null;
    additional_info: string | null;
    created_at: string;
    updated_at: string;
};

export async function ensureVendorSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendors (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            vendor_name VARCHAR(180) NOT NULL,
            vendor_type ENUM('regular','1099-nec') NOT NULL DEFAULT 'regular',
            first_name VARCHAR(120) NULL,
            last_name VARCHAR(120) NULL,
            currency VARCHAR(20) NOT NULL DEFAULT 'USD',
            email VARCHAR(180) NULL,
            country VARCHAR(120) NULL,
            province_state VARCHAR(120) NULL,
            address1 VARCHAR(255) NULL,
            address2 VARCHAR(255) NULL,
            city VARCHAR(120) NULL,
            postal_code VARCHAR(40) NULL,
            additional_info TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_vendors_name (vendor_name)
        )
    `);
}

export async function listVendors(): Promise<VendorRow[]> {
    await ensureVendorSchema();
    const [rows] = await pool.query<VendorRow[]>(`
        SELECT *
        FROM vendors
        ORDER BY vendor_name, id
    `);
    return rows;
}

export async function getVendorById(id: number): Promise<VendorRow | null> {
    await ensureVendorSchema();
    const [rows] = await pool.query<VendorRow[]>(`
        SELECT *
        FROM vendors
        WHERE id = ?
        LIMIT 1
    `, [id]);
    return rows[0] || null;
}

export async function createVendor(input: VendorInput) {
    await ensureVendorSchema();
    const name = input.vendorName.trim();
    if (!name) throw new Error("INVALID_NAME");

    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO vendors (
            vendor_name, vendor_type, first_name, last_name, currency, email,
            country, province_state, address1, address2, city, postal_code, additional_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        name,
        input.vendorType || "regular",
        input.firstName?.trim() || null,
        input.lastName?.trim() || null,
        input.currency || "USD",
        input.email?.trim() || null,
        input.country?.trim() || null,
        input.provinceState?.trim() || null,
        input.address1?.trim() || null,
        input.address2?.trim() || null,
        input.city?.trim() || null,
        input.postalCode?.trim() || null,
        input.additionalInfo?.trim() || null,
    ]);

    return getVendorById(result.insertId);
}

export async function updateVendor(id: number, input: VendorInput) {
    await ensureVendorSchema();
    const name = input.vendorName.trim();
    if (!name) throw new Error("INVALID_NAME");

    await pool.execute(`
        UPDATE vendors
        SET vendor_name = ?, vendor_type = ?, first_name = ?, last_name = ?, currency = ?, email = ?,
            country = ?, province_state = ?, address1 = ?, address2 = ?, city = ?, postal_code = ?, additional_info = ?
        WHERE id = ?
    `, [
        name,
        input.vendorType || "regular",
        input.firstName?.trim() || null,
        input.lastName?.trim() || null,
        input.currency || "USD",
        input.email?.trim() || null,
        input.country?.trim() || null,
        input.provinceState?.trim() || null,
        input.address1?.trim() || null,
        input.address2?.trim() || null,
        input.city?.trim() || null,
        input.postalCode?.trim() || null,
        input.additionalInfo?.trim() || null,
        id,
    ]);

    return getVendorById(id);
}

export async function deleteVendor(id: number) {
    await ensureVendorSchema();
    const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM vendors WHERE id = ?`, [id]);
    return result.affectedRows === 1;
}


export type BillLineInput = {
    item: string;
    expenseCategory: string;
    description: string;
    quantity: number;
    priceCents: number;
    taxCents: number;
};

export type VendorBillInput = {
    vendorId: number;
    billDate: string;
    dueDate: string;
    purchaseOrder?: string;
    billNumber?: string;
    notes?: string;
    currency?: string;
    lines: BillLineInput[];
};

export async function ensureBillSchema() {
    await ensureVendorSchema();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendor_bills (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            vendor_id BIGINT NOT NULL,
            bill_date DATE NOT NULL,
            due_date DATE NOT NULL,
            purchase_order VARCHAR(120) NULL,
            bill_number VARCHAR(120) NULL,
            notes TEXT NULL,
            currency VARCHAR(20) NOT NULL DEFAULT 'USD',
            subtotal_cents INT NOT NULL DEFAULT 0,
            total_tax_cents INT NOT NULL DEFAULT 0,
            total_cents INT NOT NULL DEFAULT 0,
            amount_paid_cents INT NOT NULL DEFAULT 0,
            status VARCHAR(40) NOT NULL DEFAULT 'unpaid',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_vendor_bills_vendor (vendor_id),
            INDEX idx_vendor_bills_dates (bill_date, due_date),
            CONSTRAINT fk_vendor_bills_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendor_bill_lines (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            bill_id BIGINT NOT NULL,
            item VARCHAR(180) NULL,
            expense_category VARCHAR(180) NULL,
            description VARCHAR(500) NULL,
            quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
            price_cents INT NOT NULL DEFAULT 0,
            tax_cents INT NOT NULL DEFAULT 0,
            amount_cents INT NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            INDEX idx_vendor_bill_lines_bill (bill_id),
            CONSTRAINT fk_vendor_bill_lines_bill FOREIGN KEY (bill_id) REFERENCES vendor_bills(id) ON DELETE CASCADE
        )
    `);
}

export async function createVendorBill(input: VendorBillInput) {
    await ensureVendorBillPaymentSchema();
    const subtotalCents = input.lines.reduce((sum, line) => sum + Math.round(Number(line.quantity || 0) * Number(line.priceCents || 0)), 0);
    const totalTaxCents = input.lines.reduce((sum, line) => sum + Math.max(0, Math.round(Number(line.taxCents || 0))), 0);
    const totalCents = subtotalCents + totalTaxCents;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute<ResultSetHeader>(`
            INSERT INTO vendor_bills (
                vendor_id, bill_date, due_date, purchase_order, bill_number, notes, currency,
                subtotal_cents, total_tax_cents, total_cents, amount_paid_cents, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'unpaid')
        `, [
            input.vendorId,
            input.billDate,
            input.dueDate,
            input.purchaseOrder?.trim() || null,
            input.billNumber?.trim() || null,
            input.notes?.trim() || null,
            input.currency || "USD",
            subtotalCents,
            totalTaxCents,
            totalCents,
        ]);

        const billId = result.insertId;
        for (let index = 0; index < input.lines.length; index += 1) {
            const line = input.lines[index];
            const amountCents = Math.round(Number(line.quantity || 0) * Number(line.priceCents || 0)) + Math.max(0, Math.round(Number(line.taxCents || 0)));
            await connection.execute(`
                INSERT INTO vendor_bill_lines (
                    bill_id, item, expense_category, description, quantity, price_cents, tax_cents, amount_cents, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                billId,
                line.item?.trim() || null,
                line.expenseCategory?.trim() || null,
                line.description?.trim() || null,
                Number(line.quantity || 0),
                Math.max(0, Math.round(Number(line.priceCents || 0))),
                Math.max(0, Math.round(Number(line.taxCents || 0))),
                amountCents,
                index,
            ]);
        }

        await connection.commit();
        return { id: billId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}


export type VendorBillRow = RowDataPacket & {
    id: number;
    vendor_id: number;
    vendor_name: string;
    bill_date: string;
    due_date: string;
    bill_number: string | null;
    currency: string;
    subtotal_cents: number;
    total_tax_cents: number;
    total_cents: number;
    amount_paid_cents: number;
    status: string;
};

export async function listVendorBills(): Promise<VendorBillRow[]> {
    await ensureBillSchema();
    const [rows] = await pool.query<VendorBillRow[]>(`
        SELECT
            b.id,
            b.vendor_id,
            v.vendor_name,
            b.bill_date,
            b.due_date,
            b.bill_number,
            b.currency,
            b.subtotal_cents,
            b.total_tax_cents,
            b.total_cents,
            b.amount_paid_cents,
            CASE
                WHEN b.amount_paid_cents >= b.total_cents AND b.total_cents > 0 THEN 'paid'
                WHEN b.amount_paid_cents > 0 THEN 'partially_paid'
                ELSE b.status
            END AS status
        FROM vendor_bills b
        JOIN vendors v ON v.id = b.vendor_id
        ORDER BY b.bill_date DESC, b.id DESC
    `);
    return rows;
}

export type VendorBillPaymentInput = {
    paymentDate: string;
    amountCents: number;
    method: string;
    accountName: string;
    memo?: string;
};

export async function ensureVendorBillPaymentSchema() {
    await ensureBillSchema();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendor_bill_payments (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            bill_id BIGINT NOT NULL,
            vendor_id BIGINT NOT NULL,
            payment_date DATE NOT NULL,
            amount_cents INT NOT NULL,
            method VARCHAR(80) NOT NULL,
            account_name VARCHAR(160) NOT NULL,
            memo VARCHAR(500) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_vendor_bill_payments_bill (bill_id),
            INDEX idx_vendor_bill_payments_vendor (vendor_id),
            INDEX idx_vendor_bill_payments_date (payment_date),
            CONSTRAINT fk_vendor_bill_payments_bill FOREIGN KEY (bill_id) REFERENCES vendor_bills(id) ON DELETE CASCADE
        )
    `);
}

export async function recordVendorBillPayment(billId: number, input: VendorBillPaymentInput) {
    await ensureBillSchema();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query<RowDataPacket[]>(`
            SELECT id, vendor_id, total_cents, amount_paid_cents
            FROM vendor_bills
            WHERE id = ?
            FOR UPDATE
        `, [billId]);
        const bill = rows[0];
        if (!bill) throw new Error("BILL_NOT_FOUND");

        const total = Number(bill.total_cents || 0);
        const currentPaid = Number(bill.amount_paid_cents || 0);
        const remaining = Math.max(0, total - currentPaid);
        const amount = Math.round(Number(input.amountCents || 0));

        if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
        if (amount > remaining) throw new Error("AMOUNT_EXCEEDS_BALANCE");
        if (!input.paymentDate || !input.method.trim() || !input.accountName.trim()) throw new Error("MISSING_PAYMENT_DETAILS");

        await connection.execute(`
            INSERT INTO vendor_bill_payments (
                bill_id, vendor_id, payment_date, amount_cents, method, account_name, memo
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            billId,
            Number(bill.vendor_id),
            input.paymentDate,
            amount,
            input.method.trim(),
            input.accountName.trim(),
            input.memo?.trim() || null,
        ]);

        const newPaid = currentPaid + amount;
        const nextStatus = newPaid >= total && total > 0 ? "paid" : "partially_paid";
        await connection.execute(
            `UPDATE vendor_bills SET amount_paid_cents = ?, status = ? WHERE id = ?`,
            [newPaid, nextStatus, billId]
        );

        await connection.commit();
        return { id: billId, amountPaidCents: newPaid, status: nextStatus };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
