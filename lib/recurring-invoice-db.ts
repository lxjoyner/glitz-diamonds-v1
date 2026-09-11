import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type RecurringInvoiceStatus = "active" | "draft" | "ended";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type RecurringEndMode = "after" | "on" | "never";

export type RecurringInvoiceRecord = RowDataPacket & {
    id: number;
    member_id: number;
    member_name: string | null;
    member_email: string | null;
    status: RecurringInvoiceStatus;
    cadence: string;
    frequency: RecurringFrequency;
    repeat_day: number;
    weekly_day: string | null;
    yearly_month: number | null;
    custom_every: number | null;
    custom_unit: string | null;
    first_invoice_date: string;
    next_invoice_date: string;
    previous_invoice_date: string | null;
    end_mode: RecurringEndMode;
    end_after_count: number | null;
    end_date: string | null;
    time_zone: string;
    amount_cents: number;
    notes: string | null;
    generated_count: number;
    last_generated_at: string | null;
    created_at: string;
    updated_at: string;
};

export type RecurringInvoiceInput = {
    memberId: number;
    status?: RecurringInvoiceStatus;
    repeatDay: number;
    firstInvoiceDate: string;
    nextInvoiceDate: string;
    amountCents: number;
    notes?: string;
    frequency?: RecurringFrequency;
    weeklyDay?: string;
    yearlyMonth?: number;
    customEvery?: number;
    customUnit?: string;
    endMode?: RecurringEndMode;
    endAfterCount?: number;
    endDate?: string;
    timeZone?: string;
};

export async function ensureRecurringInvoiceSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS recurring_invoices (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            member_id BIGINT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            cadence VARCHAR(20) NOT NULL DEFAULT 'monthly',
            frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
            repeat_day TINYINT NOT NULL DEFAULT 1,
            weekly_day VARCHAR(16) NULL,
            yearly_month TINYINT NULL,
            custom_every INT NULL,
            custom_unit VARCHAR(20) NULL,
            first_invoice_date DATE NOT NULL,
            next_invoice_date DATE NOT NULL,
            previous_invoice_date DATE NULL,
            end_mode VARCHAR(20) NOT NULL DEFAULT 'never',
            end_after_count INT NULL,
            end_date DATE NULL,
            time_zone VARCHAR(80) NOT NULL DEFAULT 'US/Central',
            amount_cents INT NOT NULL DEFAULT 0,
            notes TEXT NULL,
            generated_count INT NOT NULL DEFAULT 0,
            last_generated_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_recurring_member (member_id),
            INDEX idx_recurring_status (status),
            INDEX idx_recurring_next_date (next_invoice_date)
        )
    `);

    const [columns] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM recurring_invoices`);
    const names = new Set(columns.map((column) => String(column.Field)));
    const add = async (name: string, ddl: string) => {
        if (!names.has(name)) await pool.query(`ALTER TABLE recurring_invoices ADD COLUMN ${ddl}`);
    };
    await add("frequency", "frequency VARCHAR(20) NOT NULL DEFAULT 'monthly'");
    await add("weekly_day", "weekly_day VARCHAR(16) NULL");
    await add("yearly_month", "yearly_month TINYINT NULL");
    await add("custom_every", "custom_every INT NULL");
    await add("custom_unit", "custom_unit VARCHAR(20) NULL");
    await add("end_mode", "end_mode VARCHAR(20) NOT NULL DEFAULT 'never'");
    await add("end_after_count", "end_after_count INT NULL");
    await add("time_zone", "time_zone VARCHAR(80) NOT NULL DEFAULT 'US/Central'");
    await add("generated_count", "generated_count INT NOT NULL DEFAULT 0");
    await add("last_generated_at", "last_generated_at DATETIME NULL");

    await pool.query(`
        CREATE TABLE IF NOT EXISTS recurring_invoice_runs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            recurring_invoice_id BIGINT NOT NULL,
            scheduled_for DATE NOT NULL,
            invoice_id BIGINT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'processing',
            error_message TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_recurring_run (recurring_invoice_id, scheduled_for),
            INDEX idx_recurring_run_invoice (invoice_id)
        )
    `);
}

export async function listRecurringInvoices(): Promise<RecurringInvoiceRecord[]> {
    await ensureRecurringInvoiceSchema();
    const [rows] = await pool.query<RecurringInvoiceRecord[]>(`
        SELECT r.*, u.full_name AS member_name, u.email AS member_email
        FROM recurring_invoices r
        LEFT JOIN users u ON u.id = r.member_id
        ORDER BY r.created_at DESC, r.id DESC
    `);
    return rows;
}

export async function getRecurringInvoiceById(id: number): Promise<RecurringInvoiceRecord | null> {
    await ensureRecurringInvoiceSchema();
    const [rows] = await pool.query<RecurringInvoiceRecord[]>(`
        SELECT r.*, u.full_name AS member_name, u.email AS member_email
        FROM recurring_invoices r
        LEFT JOIN users u ON u.id = r.member_id
        WHERE r.id = ?
        LIMIT 1
    `, [id]);
    return rows[0] || null;
}

export async function createRecurringInvoice(input: RecurringInvoiceInput) {
    await ensureRecurringInvoiceSchema();
    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO recurring_invoices (
            member_id, status, cadence, frequency, repeat_day, weekly_day, yearly_month,
            custom_every, custom_unit, first_invoice_date, next_invoice_date,
            end_mode, end_after_count, end_date, time_zone, amount_cents, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        input.memberId,
        input.status || "active",
        input.frequency || "monthly",
        input.frequency || "monthly",
        input.repeatDay,
        input.weeklyDay || null,
        input.yearlyMonth || null,
        input.customEvery || null,
        input.customUnit || null,
        input.firstInvoiceDate,
        input.nextInvoiceDate,
        input.endMode || "never",
        input.endAfterCount || null,
        input.endDate || null,
        input.timeZone || "US/Central",
        input.amountCents,
        input.notes || null,
    ]);
    return getRecurringInvoiceById(result.insertId);
}

export async function updateRecurringInvoice(id: number, input: RecurringInvoiceInput) {
    await ensureRecurringInvoiceSchema();
    await pool.query(`
        UPDATE recurring_invoices
        SET member_id = ?, status = ?, cadence = ?, frequency = ?, repeat_day = ?, weekly_day = ?, yearly_month = ?,
            custom_every = ?, custom_unit = ?, first_invoice_date = ?, next_invoice_date = ?,
            end_mode = ?, end_after_count = ?, end_date = ?, time_zone = ?, amount_cents = ?, notes = ?
        WHERE id = ?
    `, [
        input.memberId,
        input.status || "active",
        input.frequency || "monthly",
        input.frequency || "monthly",
        input.repeatDay,
        input.weeklyDay || null,
        input.yearlyMonth || null,
        input.customEvery || null,
        input.customUnit || null,
        input.firstInvoiceDate,
        input.nextInvoiceDate,
        input.endMode || "never",
        input.endAfterCount || null,
        input.endDate || null,
        input.timeZone || "US/Central",
        input.amountCents,
        input.notes || null,
        id,
    ]);
    return getRecurringInvoiceById(id);
}

export async function endRecurringInvoice(id: number) {
    await ensureRecurringInvoiceSchema();
    await pool.query(`
        UPDATE recurring_invoices
        SET status = 'ended', end_date = CURDATE()
        WHERE id = ?
    `, [id]);
    return getRecurringInvoiceById(id);
}

export async function listDueRecurringInvoices(todayIso: string): Promise<RecurringInvoiceRecord[]> {
    await ensureRecurringInvoiceSchema();
    const [rows] = await pool.query<RecurringInvoiceRecord[]>(`
        SELECT r.*, u.full_name AS member_name, u.email AS member_email
        FROM recurring_invoices r
        LEFT JOIN users u ON u.id = r.member_id
        WHERE r.status = 'active'
          AND r.next_invoice_date <= ?
          AND (r.end_mode <> 'on' OR r.end_date IS NULL OR r.next_invoice_date <= r.end_date)
          AND (r.end_mode <> 'after' OR r.end_after_count IS NULL OR r.generated_count < r.end_after_count)
        ORDER BY r.next_invoice_date ASC, r.id ASC
    `, [todayIso]);
    return rows;
}

export async function claimRecurringRun(recurringInvoiceId: number, scheduledFor: string) {
    await ensureRecurringInvoiceSchema();
    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT IGNORE INTO recurring_invoice_runs (recurring_invoice_id, scheduled_for, status)
        VALUES (?, ?, 'processing')
    `, [recurringInvoiceId, scheduledFor]);
    return result.affectedRows === 1;
}

export async function completeRecurringRun(params: {
    recurringInvoiceId: number;
    scheduledFor: string;
    invoiceId: number;
    nextInvoiceDate: string;
}) {
    await ensureRecurringInvoiceSchema();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(`
            UPDATE recurring_invoice_runs
            SET invoice_id = ?, status = 'completed', error_message = NULL
            WHERE recurring_invoice_id = ? AND scheduled_for = ?
        `, [params.invoiceId, params.recurringInvoiceId, params.scheduledFor]);
        await connection.execute(`
            UPDATE recurring_invoices
            SET previous_invoice_date = ?, next_invoice_date = ?, generated_count = generated_count + 1,
                last_generated_at = NOW(),
                status = IF(end_mode = 'after' AND end_after_count IS NOT NULL AND generated_count + 1 >= end_after_count, 'ended', status)
            WHERE id = ?
        `, [params.scheduledFor, params.nextInvoiceDate, params.recurringInvoiceId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function failRecurringRun(recurringInvoiceId: number, scheduledFor: string, message: string) {
    await ensureRecurringInvoiceSchema();
    await pool.query(`
        UPDATE recurring_invoice_runs
        SET status = 'failed', error_message = ?
        WHERE recurring_invoice_id = ? AND scheduled_for = ?
    `, [message.slice(0, 4000), recurringInvoiceId, scheduledFor]);
}
