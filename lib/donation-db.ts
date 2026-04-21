import pool from "@/lib/db";

export type DonationRecord = {
    id: number;
    donor_name: string | null;
    donor_email: string | null;
    message: string | null;
    amount_cents: number;
    stripe_session_id: string;
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
            stripe_session_id VARCHAR(128) NOT NULL UNIQUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_donations_created_at (created_at)
        )
    `);

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
        INSERT INTO donations (donor_name, donor_email, message, amount_cents, stripe_session_id)
        VALUES (?, ?, ?, ?, ?)
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
        SELECT id, donor_name, donor_email, message, amount_cents, stripe_session_id, created_at
        FROM donations
        ORDER BY created_at DESC
    `);

    return rows as DonationRecord[];
}
