import pool from "@/lib/db";

export type DonationRecord = {
    id: number;
    donor_name: string | null;
    donor_email: string | null;
    message: string | null;
    amount_cents: number;
    stripe_session_id: string | null;
    stripe_payment_intent_id: string | null;
    payment_status: string;
    created_at: string;
    donation_date: string | null;
    account_name: string | null;
    payment_method: string | null;
    reference_number: string | null;
    member_id: number | null;
};

let bootstrapped = false;

async function ensureDonationsTable() {
    if (bootstrapped) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS donations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            donor_name VARCHAR(120) NULL,
            donor_email VARCHAR(255) NULL,
            message VARCHAR(255) NULL,
            amount_cents INT NOT NULL,
            stripe_session_id VARCHAR(128) NULL UNIQUE,
            stripe_payment_intent_id VARCHAR(128) NULL UNIQUE,
            payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_donations_created_at (created_at)
        )
    `);

    await pool.query("ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(128) NULL UNIQUE");
    await pool.query("ALTER TABLE donations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40) NOT NULL DEFAULT 'pending'");

    const [columns] = await pool.query<import("mysql2/promise").RowDataPacket[]>( "SHOW COLUMNS FROM donations" );
    const names = new Set(columns.map(column => String(column.Field)));
    if (!names.has("donation_date")) await pool.query("ALTER TABLE donations ADD COLUMN donation_date DATE NULL");
    if (!names.has("account_name")) await pool.query("ALTER TABLE donations ADD COLUMN account_name VARCHAR(120) NULL");
    if (!names.has("payment_method")) await pool.query("ALTER TABLE donations ADD COLUMN payment_method VARCHAR(80) NULL");
    if (!names.has("reference_number")) await pool.query("ALTER TABLE donations ADD COLUMN reference_number VARCHAR(160) NULL");
    if (!names.has("member_id")) await pool.query("ALTER TABLE donations ADD COLUMN member_id BIGINT NULL");
    bootstrapped = true;
}

export async function createDonationRecord(params: {
    donorName?: string;
    donorEmail?: string;
    message?: string;
    amountCents: number;
    stripeSessionId: string;
}) {
    await ensureDonationsTable();

    await pool.query(
        `
        INSERT INTO donations (donor_name, donor_email, message, amount_cents, stripe_session_id, payment_status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE donor_name = VALUES(donor_name), donor_email = VALUES(donor_email), message = VALUES(message), amount_cents = VALUES(amount_cents)
        `,
        [
            params.donorName || null,
            params.donorEmail || null,
            params.message || null,
            params.amountCents,
            params.stripeSessionId,
        ]
    );
}

export async function getAllDonations(): Promise<DonationRecord[]> {
    await ensureDonationsTable();

    const [rows] = await pool.query(`
        SELECT id, donor_name, donor_email, message, amount_cents, stripe_session_id, stripe_payment_intent_id, payment_status, created_at, DATE_FORMAT(donation_date, '%Y-%m-%d') AS donation_date, account_name, payment_method, reference_number, member_id
        FROM donations
        ORDER BY created_at DESC
    `);

    return rows as DonationRecord[];
}

export async function createManualDonationRecord(params: {
    donorName?: string;
    donorEmail?: string;
    message?: string;
    amountCents: number;
}) {
    await ensureDonationsTable();

    await pool.query(
        `
        INSERT INTO donations (donor_name, donor_email, message, amount_cents, payment_status)
        VALUES (?, ?, ?, ?, 'manual')
        `,
        [params.donorName || null, params.donorEmail || null, params.message || null, params.amountCents]
    );
}

export function validDonationDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + "T00:00:00Z");
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === date;
}

export async function getDonationPaymentAccounts() {
    await ensureDonationsTable();
    const [rows] = await pool.query<import("mysql2/promise").RowDataPacket[]>(
        "SELECT name FROM invoice_payment_accounts WHERE is_active=1 ORDER BY sort_order, name"
    );
    return rows.map(row => String(row.name));
}

export async function createDetailedManualDonation(input: {
    donorName: string; donorEmail?: string; message?: string;
    donationDate: string; amountCents: number; accountName: string;
    paymentMethod: string; referenceNumber?: string; memberId?: number | null;
}) {
    await ensureDonationsTable();
    if (!validDonationDate(input.donationDate) || !Number.isSafeInteger(input.amountCents) ||
        input.amountCents <= 0 || !input.donorName.trim() || input.donorName.length > 120 ||
        (input.donorEmail || "").length > 255 || (input.message || "").length > 255 ||
        (input.referenceNumber || "").length > 160 ||
        !input.paymentMethod.trim() || input.paymentMethod.length > 80 ||
        !input.accountName.trim()) throw new Error("INVALID_DONATION");
    if (input.donorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.donorEmail)) {
        throw new Error("INVALID_DONATION");
    }
    const accounts = await getDonationPaymentAccounts();
    if (!accounts.includes(input.accountName)) throw new Error("INVALID_ACCOUNT");
    if (input.memberId != null) {
        if (!Number.isSafeInteger(input.memberId) || input.memberId <= 0) throw new Error("INVALID_MEMBER");
        const [members] = await pool.query<import("mysql2/promise").RowDataPacket[]>(
            "SELECT id FROM users WHERE id=? LIMIT 1", [input.memberId]
        );
        if (members.length === 0) throw new Error("INVALID_MEMBER");
    }
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
        "INSERT INTO donations (donor_name,donor_email,message,amount_cents,payment_status,donation_date,account_name,payment_method,reference_number,member_id) VALUES (?,?,?,?,'manual',?,?,?,?,?)",
        [input.donorName.trim(),input.donorEmail?.trim() || null,input.message?.trim() || null,
         input.amountCents,input.donationDate,input.accountName.trim(),input.paymentMethod.trim(),
         input.referenceNumber?.trim() || null,input.memberId ?? null]
    );
    return result.insertId;
}

export async function deleteDonationRecordById(id: number) {
    await ensureDonationsTable();

    await pool.query("DELETE FROM donations WHERE id = ? LIMIT 1", [id]);
}

export async function upsertCompletedStripeDonation(params: {
    paymentIntentId: string;
    amountCents: number;
    donorName?: string;
    donorEmail?: string;
    message?: string;
    createdAtUnix: number;
}) {
    await ensureDonationsTable();

    const createdAt = new Date(params.createdAtUnix * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

    await pool.query(
        `
        INSERT INTO donations (
            donor_name,
            donor_email,
            message,
            amount_cents,
            stripe_payment_intent_id,
            payment_status,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, 'succeeded', ?)
        ON DUPLICATE KEY UPDATE
            donor_name = VALUES(donor_name),
            donor_email = VALUES(donor_email),
            message = VALUES(message),
            amount_cents = VALUES(amount_cents),
            payment_status = 'succeeded'
        `,
        [
            params.donorName || null,
            params.donorEmail || null,
            params.message || null,
            params.amountCents,
            params.paymentIntentId,
            createdAt,
        ]
    );
}
