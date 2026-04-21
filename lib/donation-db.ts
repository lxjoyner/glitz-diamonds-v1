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
        SELECT id, donor_name, donor_email, message, amount_cents, stripe_session_id, stripe_payment_intent_id, payment_status, created_at
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
