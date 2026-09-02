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
    discountCents?: number;
    taxCents?: number;
    items: InvoiceItemInput[];
};

export type InvoiceRecord = RowDataPacket & {
    id: number;
    invoice_number: string;
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
    public_token: string | null;
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

export type PublicInvoiceRecord = InvoiceRecord & {
    business_name: string | null;
    business_address: string | null;
    business_phone: string | null;
    business_email: string | null;
    footer_text: string | null;
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

export async function getInvoiceByPublicToken(token: string): Promise<PublicInvoice | null> {
    await ensureInvoiceSchema();
    const [rows] = await pool.query<PublicInvoiceRecord[]>(`
        SELECT i.*, u.full_name AS member_name, u.email AS member_email,
               s.business_name, s.business_address, s.business_phone, s.business_email, s.footer_text,
               s.logo_data IS NOT NULL AS has_logo
        FROM invoices i
        LEFT JOIN users u ON u.id = i.member_id
        CROSS JOIN invoice_settings s
        WHERE i.public_token = ?
        LIMIT 1
    `, [token]);
    if (!rows[0]) return null;
    const row = rows[0];
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
                subtotal_cents, discount_cents, tax_cents, total_cents, notes, terms, public_token
            ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
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
