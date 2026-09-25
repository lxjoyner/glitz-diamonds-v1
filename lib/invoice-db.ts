import pool from "@/lib/db";
import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type InvoiceStatus = "draft" | "sent" | "viewed" | "due" | "past_due" | "partially_paid" | "paid" | "void";

export type InvoiceItemInput = {
    description: string;
    quantity: number;
    unitPriceCents: number;
};

export type InvoiceInput = {
    memberId: number;
    invoiceDate: string;
    dueDate: string;
    referenceNumber?: string;
    notes?: string;
    terms?: string;
    footerText?: string;
    discountCents?: number;
    taxCents?: number;
    items: InvoiceItemInput[];
};

export type InvoiceRecord = RowDataPacket & {
    id: number;
    invoice_number: string;
    public_token: string | null;
    member_id: number;
    member_name: string | null;
    member_email: string | null;
    invoice_date: string;
    due_date: string;
    reference_number: string | null;
    status: string;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
    amount_paid_cents: number;
    notes: string | null;
    terms: string | null;
    footer_text: string | null;
    sent_at: string | null;
    viewed_at: string | null;
};

export type InvoiceWithDisplayStatus = InvoiceRecord & {
    display_status: string;
};

export type PublicInvoiceItem = RowDataPacket & {
    description: string;
    quantity: number | string;
    unit_price_cents: number;
    line_total_cents: number;
};

export type InvoiceEditRecord = InvoiceWithDisplayStatus & {
    items: PublicInvoiceItem[];
};

export type PublicInvoiceRecord = InvoiceRecord & {
    business_name: string | null;
    business_address: string | null;
    business_phone: string | null;
    business_email: string | null;
    default_footer_text: string | null;
    has_logo: number | boolean;
};

export type PublicInvoice = PublicInvoiceRecord & {
    items: PublicInvoiceItem[];
    display_status: string;
};

export async function ensureInvoiceSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_settings (
            id INT PRIMARY KEY DEFAULT 1,
            business_name VARCHAR(180) NOT NULL DEFAULT 'Glitz Of Diamonds',
            business_address VARCHAR(500) NULL,
            business_phone VARCHAR(80) NULL,
            business_email VARCHAR(180) NULL,
            invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'GOD',
            default_terms TEXT NULL,
            footer_text TEXT NULL,
            logo_mime_type VARCHAR(100) NULL,
            logo_data MEDIUMBLOB NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`INSERT IGNORE INTO invoice_settings (id) VALUES (1)`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoices (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            invoice_number VARCHAR(50) UNIQUE NULL,
            member_id BIGINT NOT NULL,
            invoice_date DATE NOT NULL,
            due_date DATE NOT NULL,
            reference_number VARCHAR(120) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'draft',
            subtotal_cents INT NOT NULL DEFAULT 0,
            discount_cents INT NOT NULL DEFAULT 0,
            tax_cents INT NOT NULL DEFAULT 0,
            total_cents INT NOT NULL DEFAULT 0,
            amount_paid_cents INT NOT NULL DEFAULT 0,
            notes TEXT NULL,
            terms TEXT NULL,
            footer_text TEXT NULL,
            public_token VARCHAR(96) UNIQUE NULL,
            sent_at DATETIME NULL,
            viewed_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_invoices_member (member_id),
            INDEX idx_invoices_due_date (due_date),
            INDEX idx_invoices_status (status),
            INDEX idx_invoices_public_token (public_token)
        )
    `);

    const [columns] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM invoices`);
    const columnNames = new Set(columns.map((column) => String(column.Field)));
    if (!columnNames.has("footer_text")) await pool.query(`ALTER TABLE invoices ADD COLUMN footer_text TEXT NULL`);
    if (!columnNames.has("public_token")) await pool.query(`ALTER TABLE invoices ADD COLUMN public_token VARCHAR(96) UNIQUE NULL`);
    if (!columnNames.has("sent_at")) await pool.query(`ALTER TABLE invoices ADD COLUMN sent_at DATETIME NULL`);
    if (!columnNames.has("viewed_at")) await pool.query(`ALTER TABLE invoices ADD COLUMN viewed_at DATETIME NULL`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_items (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            invoice_id BIGINT NOT NULL,
            description VARCHAR(500) NOT NULL,
            quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
            unit_price_cents INT NOT NULL DEFAULT 0,
            line_total_cents INT NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_invoice_items_invoice (invoice_id),
            CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_payments (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            invoice_id BIGINT NOT NULL,
            member_id BIGINT NOT NULL,
            payment_date DATE NOT NULL,
            amount_cents INT NOT NULL,
            method VARCHAR(50) NOT NULL,
            account_name VARCHAR(120) NOT NULL,
            memo VARCHAR(500) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_invoice_payments_invoice (invoice_id),
            INDEX idx_invoice_payments_member (member_id),
            INDEX idx_invoice_payments_date (payment_date),
            CONSTRAINT fk_invoice_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_payment_methods (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(80) NOT NULL UNIQUE,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS invoice_payment_accounts (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL UNIQUE,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        INSERT IGNORE INTO invoice_payment_methods (name, sort_order) VALUES
        ('Bank payment', 10), ('Cash', 20), ('Check', 30), ('Credit card', 40), ('PayPal', 50), ('Other', 60)
    `);
    await pool.query(`
        INSERT IGNORE INTO invoice_payment_accounts (name, sort_order) VALUES
        ('Cash on Hand (USD)', 10)
    `);
    await pool.query(`
        UPDATE invoice_payment_accounts
        SET is_active = 0
        WHERE name = 'Wave Payroll Clearing (USD)'
    `);
}

function computedStatus(row: { status: string; due_date: string; total_cents: number; amount_paid_cents: number }) {
    if (["draft", "paid", "void"].includes(row.status)) return row.status;
    if (row.amount_paid_cents > 0 && row.amount_paid_cents < row.total_cents) return "partially_paid";
    if (row.amount_paid_cents >= row.total_cents && row.total_cents > 0) return "paid";
    const due = new Date(`${String(row.due_date).slice(0, 10)}T23:59:59`);
    return due.getTime() < Date.now() ? "past_due" : "due";
}

export async function listInvoices(): Promise<InvoiceWithDisplayStatus[]> {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<InvoiceRecord[]>(`
        SELECT i.*, u.full_name AS member_name, u.email AS member_email
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        ORDER BY i.created_at DESC, i.id DESC
    `);
    return rows.map((row) => ({ ...row, display_status: computedStatus(row) }));
}

export async function getInvoiceSettings() {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, business_name, business_address, business_phone, business_email,
               invoice_prefix, default_terms, footer_text, logo_mime_type,
               logo_data IS NOT NULL AS has_logo, updated_at
        FROM invoice_settings WHERE id = 1
    `);
    return rows[0];
}

export async function updateInvoiceSettings(input: {
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    invoicePrefix?: string;
    defaultTerms?: string;
    footerText?: string;
    logoMimeType?: string | null;
    logoData?: Buffer | null;
}) {
    await ensureInvoiceSchema();
    const fields = [
        "business_name = ?",
        "business_address = ?",
        "business_phone = ?",
        "business_email = ?",
        "invoice_prefix = ?",
        "default_terms = ?",
        "footer_text = ?",
    ];
    const values: unknown[] = [
        input.businessName || "Glitz Of Diamonds",
        input.businessAddress || null,
        input.businessPhone || null,
        input.businessEmail || null,
        (input.invoicePrefix || "GOD").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20),
        input.defaultTerms || null,
        input.footerText || null,
    ];
    if (input.logoData !== undefined) {
        fields.push("logo_mime_type = ?", "logo_data = ?");
        values.push(input.logoMimeType || null, input.logoData);
    }
    values.push(1);
    await pool.query(`UPDATE invoice_settings SET ${fields.join(", ")} WHERE id = ?`, values);
    return getInvoiceSettings();
}

export async function getInvoiceLogo() {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT logo_mime_type, logo_data FROM invoice_settings WHERE id = 1`);
    return rows[0] as { logo_mime_type: string | null; logo_data: Buffer | null } | undefined;
}

export async function getInvoiceById(invoiceId: number): Promise<InvoiceWithDisplayStatus | null> {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<InvoiceRecord[]>(`
        SELECT i.*, u.full_name AS member_name, u.email AS member_email
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        WHERE i.id = ?
        LIMIT 1
    `, [invoiceId]);
    if (!rows[0]) return null;
    const row = rows[0];
    if (!row.public_token) {
        const token = crypto.randomBytes(32).toString("hex");
        await pool.query(`UPDATE invoices SET public_token = ? WHERE id = ?`, [token, invoiceId]);
        row.public_token = token;
    }
    return { ...row, display_status: computedStatus(row) };
}

export async function getInvoiceForEdit(invoiceId: number): Promise<InvoiceEditRecord | null> {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) return null;
    const [items] = await pool.query<PublicInvoiceItem[]>(`
        SELECT description, quantity, unit_price_cents, line_total_cents
        FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY sort_order, id
    `, [invoiceId]);
    return { ...invoice, items };
}

export async function updateInvoice(invoiceId: number, input: InvoiceInput) {
    await ensureInvoiceSchema();
    const subtotalCents = input.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
    const discountCents = Math.max(0, Math.round(input.discountCents || 0));
    const taxCents = Math.max(0, Math.round(input.taxCents || 0));
    const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(`
            UPDATE invoices
            SET member_id = ?, invoice_date = ?, due_date = ?, reference_number = ?,
                subtotal_cents = ?, discount_cents = ?, tax_cents = ?, total_cents = ?, notes = ?, terms = ?, footer_text = ?
            WHERE id = ?
        `, [
            input.memberId,
            input.invoiceDate,
            input.dueDate,
            input.referenceNumber || null,
            subtotalCents,
            discountCents,
            taxCents,
            totalCents,
            input.notes || null,
            input.terms || null,
            input.footerText || null,
            invoiceId,
        ]);
        await connection.execute(`DELETE FROM invoice_items WHERE invoice_id = ?`, [invoiceId]);
        for (let index = 0; index < input.items.length; index += 1) {
            const item = input.items[index];
            const lineTotal = Math.round(item.quantity * item.unitPriceCents);
            await connection.execute(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [invoiceId, item.description, item.quantity, item.unitPriceCents, lineTotal, index]);
        }
        await connection.commit();
        return getInvoiceForEdit(invoiceId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function getInvoiceByPublicToken(token: string): Promise<PublicInvoice | null> {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<PublicInvoiceRecord[]>(`
        SELECT i.*, u.full_name AS member_name, u.email AS member_email,
               s.business_name, s.business_address, s.business_phone, s.business_email,
               s.footer_text AS default_footer_text,
               s.logo_data IS NOT NULL AS has_logo
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        CROSS JOIN invoice_settings s
        WHERE i.public_token = ?
        LIMIT 1
    `, [token]);
    if (!rows[0]) return null;
    const row = rows[0];
    if (!row.footer_text) row.footer_text = row.default_footer_text;
    const [items] = await pool.query<PublicInvoiceItem[]>(`
        SELECT description, quantity, unit_price_cents, line_total_cents
        FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id
    `, [row.id]);
    return { ...row, items, display_status: computedStatus(row) };
}

export async function markInvoiceSent(invoiceId: number) {
    await ensureInvoiceSchema();
    await pool.query(`UPDATE invoices SET status = IF(status = 'draft', 'sent', status), sent_at = NOW() WHERE id = ?`, [invoiceId]);
}

export async function markInvoiceViewed(token: string) {
    await ensureInvoiceSchema();
    await pool.query(`UPDATE invoices SET status = IF(status IN ('sent','draft'), 'viewed', status), viewed_at = COALESCE(viewed_at, NOW()) WHERE public_token = ?`, [token]);
}

export async function deleteInvoice(invoiceId: number) {
    await ensureInvoiceSchema();
    await pool.query(`UPDATE recurring_invoice_runs SET invoice_id = NULL WHERE invoice_id = ?`, [invoiceId]);
    const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM invoices WHERE id = ?`, [invoiceId]);
    return result.affectedRows === 1;
}

export async function createInvoice(input: InvoiceInput) {
    await ensureInvoiceSchema();
    const subtotalCents = input.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
    const discountCents = Math.max(0, Math.round(input.discountCents || 0));
    const taxCents = Math.max(0, Math.round(input.taxCents || 0));
    const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const publicToken = crypto.randomBytes(32).toString("hex");
        const [result] = await connection.execute<ResultSetHeader>(`
            INSERT INTO invoices (
                member_id, invoice_date, due_date, reference_number, status,
                subtotal_cents, discount_cents, tax_cents, total_cents, notes, terms, footer_text, public_token
            ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            input.memberId,
            input.invoiceDate,
            input.dueDate,
            input.referenceNumber || null,
            subtotalCents,
            discountCents,
            taxCents,
            totalCents,
            input.notes || null,
            input.terms || null,
            input.footerText || null,
            publicToken,
        ]);

        const invoiceId = result.insertId;
        const [settings] = await connection.query<RowDataPacket[]>(`SELECT invoice_prefix FROM invoice_settings WHERE id = 1`);
        const prefix = String(settings[0]?.invoice_prefix || "GOD");
        const year = new Date(input.invoiceDate).getFullYear();
        const invoiceNumber = `${prefix}-${year}-${String(invoiceId).padStart(5, "0")}`;
        await connection.execute(`UPDATE invoices SET invoice_number = ? WHERE id = ?`, [invoiceNumber, invoiceId]);

        for (let index = 0; index < input.items.length; index += 1) {
            const item = input.items[index];
            const lineTotal = Math.round(item.quantity * item.unitPriceCents);
            await connection.execute(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [invoiceId, item.description, item.quantity, item.unitPriceCents, lineTotal, index]);
        }

        await connection.commit();
        return { id: invoiceId, invoiceNumber, publicToken };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}


export type InvoicePaymentInput = {
    paymentDate: string;
    amountCents: number;
    method: string;
    accountName: string;
    memo?: string;
};

export async function recordInvoicePayment(invoiceId: number, input: InvoicePaymentInput) {
    await ensureInvoiceSchema();
    const amountCents = Number(input.amountCents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("INVALID_AMOUNT");

    // Lock the invoice before checking its balance, so simultaneous payment submissions
    // cannot both apply a payment against the same remaining amount.
    const connection = await pool.getConnection();
    let paymentId: number;
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query<RowDataPacket[]>(`
            SELECT id, member_id, total_cents, amount_paid_cents, status
            FROM invoices WHERE id = ? FOR UPDATE
        `, [invoiceId]);
        const invoice = rows[0];
        if (!invoice) throw new Error("INVOICE_NOT_FOUND");

        const currentPaid = Number(invoice.amount_paid_cents || 0);
        const total = Number(invoice.total_cents || 0);
        if (amountCents > Math.max(0, total - currentPaid)) throw new Error("AMOUNT_EXCEEDS_BALANCE");

        const [inserted] = await connection.execute<ResultSetHeader>(`
            INSERT INTO invoice_payments (invoice_id, member_id, payment_date, amount_cents, method, account_name, memo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            invoiceId,
            invoice.member_id,
            input.paymentDate,
            amountCents,
            input.method,
            input.accountName,
            input.memo || null,
        ]);
        paymentId = inserted.insertId;

        const newPaid = currentPaid + amountCents;
        const nextStatus = newPaid >= total && total > 0 ? "paid" : "partially_paid";
        await connection.execute(
            `UPDATE invoices SET amount_paid_cents = ?, status = ? WHERE id = ?`,
            [newPaid, nextStatus, invoiceId]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    // Payment is already committed: an unexpected read failure here must not
    // cause the caller to mistake a saved payment for a rejected one and retry it.
    let savedInvoice: InvoiceWithDisplayStatus | null = null;
    try {
        savedInvoice = await getInvoiceById(invoiceId);
    } catch (error) {
        console.error("Payment was recorded, but its refreshed invoice could not be loaded:", error);
    }
    return { invoice: savedInvoice, paymentId };
}

export async function listInvoicePaymentMethods() {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, name, is_active, sort_order
        FROM invoice_payment_methods
        WHERE is_active = 1
          AND name <> 'Wave Payroll Clearing (USD)'
        ORDER BY sort_order, name
    `);
    return rows;
}

export async function listInvoicePaymentAccounts() {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, name, is_active, sort_order
        FROM invoice_payment_accounts
        WHERE is_active = 1
        ORDER BY sort_order, name
    `);
    return rows;
}

export async function createInvoicePaymentMethod(name: string) {
    await ensureInvoiceSchema();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("INVALID_NAME");
    const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO invoice_payment_methods (name, sort_order) VALUES (?, 100)`,
        [trimmed]
    );
    return { id: result.insertId, name: trimmed };
}

export async function renameInvoicePaymentMethod(id: number, name: string) {
    await ensureInvoiceSchema();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("INVALID_NAME");
    const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE invoice_payment_methods SET name = ? WHERE id = ?`,
        [trimmed, id]
    );
    if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
    return { id, name: trimmed };
}

export async function createInvoicePaymentAccount(name: string) {
    await ensureInvoiceSchema();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("INVALID_NAME");
    const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO invoice_payment_accounts (name, sort_order) VALUES (?, 100)`,
        [trimmed]
    );
    return { id: result.insertId, name: trimmed };
}

export async function renameInvoicePaymentAccount(id: number, name: string) {
    await ensureInvoiceSchema();
    const trimmed = name.trim();
    if (!trimmed) throw new Error("INVALID_NAME");
    const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE invoice_payment_accounts SET name = ? WHERE id = ?`,
        [trimmed, id]
    );
    if (result.affectedRows !== 1) throw new Error("NOT_FOUND");
    return { id, name: trimmed };
}


export type IncomeByCustomerRow = RowDataPacket & {
    member_id: number;
    customer_name: string;
    all_income_cents: number;
    paid_income_cents: number;
};

export async function getIncomeByCustomerReport(fromDate: string, toDate: string): Promise<IncomeByCustomerRow[]> {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<IncomeByCustomerRow[]>(`
        SELECT
            i.member_id,
            COALESCE(u.full_name, CONCAT('Member #', i.member_id)) AS customer_name,
            COALESCE(SUM(i.total_cents), 0) AS all_income_cents,
            COALESCE(SUM(i.amount_paid_cents), 0) AS paid_income_cents
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        WHERE i.invoice_date BETWEEN ? AND ?
          AND i.status <> 'void'
        GROUP BY i.member_id, u.full_name
        ORDER BY customer_name
    `, [fromDate, toDate]);
    return rows;
}


export type AccountTransactionRow = RowDataPacket & {
    id: number;
    transaction_key: string;
    transaction_date: string;
    invoice_id: number;
    invoice_number: string;
    public_token: string | null;
    member_id: number;
    customer_name: string;
    debit_cents: number;
    credit_cents: number;
    description: string;
};

export type AccountTransactionsReport = {
    rows: AccountTransactionRow[];
    openingBalanceCents: number;
};

export async function getAccountTransactionsReport(input: {
    memberId: number;
    fromDate: string;
    toDate: string;
    reportType: "accrual" | "cash" | "cash_only";
}): Promise<AccountTransactionsReport> {
    await ensureInvoiceSchema();

    // Cash reports contain dated payment-ledger entries only. Historical imported
    // invoices have amounts paid, but no known payment date/method: counting them
    // as dated cash receipts would invent accounting data.
    if (input.reportType === "cash" || input.reportType === "cash_only") {
        const cashOnly = input.reportType === "cash_only" ? "AND LOWER(p.method) = 'cash'" : "";
        const [rows] = await pool.query<AccountTransactionRow[]>(`
            SELECT
                p.id,
                CONCAT('payment-', p.id) AS transaction_key,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS transaction_date,
                p.invoice_id,
                i.invoice_number,
                i.public_token,
                p.member_id,
                COALESCE(u.full_name, CONCAT('Member #', p.member_id)) AS customer_name,
                0 AS debit_cents,
                p.amount_cents AS credit_cents,
                CONCAT(COALESCE(u.full_name, CONCAT('Member #', p.member_id)), ' - Payment for Invoice ', i.invoice_number) AS description
            FROM invoice_payments p
            JOIN invoices i ON i.id = p.invoice_id
            LEFT JOIN users u ON u.id = p.member_id
            WHERE (? = 0 OR p.member_id = ?)
              AND p.payment_date BETWEEN ? AND ?
              ${cashOnly}
            ORDER BY p.payment_date, p.id
        `, [input.memberId, input.memberId, input.fromDate, input.toDate]);
        return { rows, openingBalanceCents: 0 };
    }

    // Accrual must contain BOTH the invoice charge and a separate credit for
    // each recorded payment. Each row uses its actual event date.
    //
    // The historical invoice importer saves amount_paid_cents without a matching
    // invoice_payments record. Recover only that unitemized paid portion, after
    // subtracting all itemized payment rows to prevent double-counting. Because
    // historical payment dates were not imported, the invoice date is used as
    // the report placement date and the row is explicitly labeled as such.
    const historicalPaid = `
        SELECT i.id, i.invoice_date, i.invoice_number, i.public_token, i.member_id,
            COALESCE(u.full_name, CONCAT('Member #', i.member_id)) AS customer_name,
            (i.amount_paid_cents - COALESCE(paid.itemized_cents, 0)) AS historical_cents
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        LEFT JOIN (
            SELECT invoice_id, SUM(amount_cents) AS itemized_cents
            FROM invoice_payments
            GROUP BY invoice_id
        ) paid ON paid.invoice_id = i.id
        WHERE i.status <> 'void'
          AND i.amount_paid_cents > COALESCE(paid.itemized_cents, 0)
    `;

    const [rows] = await pool.query<AccountTransactionRow[]>(`
        SELECT activity.id, activity.transaction_key, activity.transaction_date,
            activity.invoice_id, activity.invoice_number, activity.public_token,
            activity.member_id, activity.customer_name, activity.debit_cents,
            activity.credit_cents, activity.description
        FROM (
            SELECT i.id,
                CONCAT('invoice-', i.id) AS transaction_key,
                DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS transaction_date,
                i.id AS invoice_id, i.invoice_number, i.public_token, i.member_id,
                COALESCE(u.full_name, CONCAT('Member #', i.member_id)) AS customer_name,
                i.total_cents AS debit_cents, 0 AS credit_cents,
                CONCAT(COALESCE(u.full_name, CONCAT('Member #', i.member_id)), ' - ', i.invoice_number) AS description,
                0 AS entry_order
            FROM invoices i
            LEFT JOIN users u ON u.id = i.member_id
            WHERE (? = 0 OR i.member_id = ?)
              AND i.invoice_date BETWEEN ? AND ?
              AND i.status <> 'void'

            UNION ALL

            SELECT p.id,
                CONCAT('payment-', p.id) AS transaction_key,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS transaction_date,
                p.invoice_id, i.invoice_number, i.public_token, p.member_id,
                COALESCE(u.full_name, CONCAT('Member #', p.member_id)) AS customer_name,
                0 AS debit_cents, p.amount_cents AS credit_cents,
                CONCAT(COALESCE(u.full_name, CONCAT('Member #', p.member_id)),
                    ' - Payment for Invoice ', i.invoice_number) AS description,
                1 AS entry_order
            FROM invoice_payments p
            JOIN invoices i ON i.id = p.invoice_id
            LEFT JOIN users u ON u.id = p.member_id
            WHERE (? = 0 OR p.member_id = ?)
              AND p.payment_date BETWEEN ? AND ?
              AND i.status <> 'void'

            UNION ALL

            SELECT h.id,
                CONCAT('historical-payment-', h.id) AS transaction_key,
                DATE_FORMAT(h.invoice_date, '%Y-%m-%d') AS transaction_date,
                h.id AS invoice_id, h.invoice_number, h.public_token, h.member_id,
                h.customer_name, 0 AS debit_cents,
                h.historical_cents AS credit_cents,
                CONCAT(h.customer_name, ' - Historical payment for Invoice ',
                    h.invoice_number, ' (payment date unavailable)') AS description,
                2 AS entry_order
            FROM (${historicalPaid}) h
            WHERE (? = 0 OR h.member_id = ?)
              AND h.invoice_date BETWEEN ? AND ?
        ) activity
        ORDER BY activity.transaction_date, activity.invoice_id,
            activity.entry_order, activity.id
    `, [
        input.memberId, input.memberId, input.fromDate, input.toDate,
        input.memberId, input.memberId, input.fromDate, input.toDate,
        input.memberId, input.memberId, input.fromDate, input.toDate,
    ]);

    // The date filter must not reset an existing customer receivable to zero.
    // Bring forward charges and credits from before the requested start date.
    const [opening] = await pool.query<RowDataPacket[]>(`
        SELECT (
            (SELECT COALESCE(SUM(i.total_cents), 0)
             FROM invoices i
             WHERE (? = 0 OR i.member_id = ?)
               AND i.invoice_date < ? AND i.status <> 'void')
            -
            (SELECT COALESCE(SUM(p.amount_cents), 0)
             FROM invoice_payments p
             JOIN invoices i ON i.id = p.invoice_id
             WHERE (? = 0 OR p.member_id = ?)
               AND p.payment_date < ? AND i.status <> 'void')
            -
            (SELECT COALESCE(SUM(h.historical_cents), 0)
             FROM (${historicalPaid}) h
             WHERE (? = 0 OR h.member_id = ?) AND h.invoice_date < ?)
        ) AS opening_cents
    `, [
        input.memberId, input.memberId, input.fromDate,
        input.memberId, input.memberId, input.fromDate,
        input.memberId, input.memberId, input.fromDate,
    ]);

    return { rows, openingBalanceCents: Number(opening[0]?.opening_cents || 0) };
}


export async function listAccountTransactionContacts() {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT DISTINCT
            i.member_id AS id,
            COALESCE(u.full_name, CONCAT('Member #', i.member_id)) AS name
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        ORDER BY name
    `);
    return rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
    }));
}
