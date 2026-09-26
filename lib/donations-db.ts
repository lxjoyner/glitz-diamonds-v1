import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureInvoiceSchema, listInvoicePaymentAccounts } from "@/lib/invoice-db";

export type DonationInput = {
    donationDate: string;
    donorName: string;
    donorEmail?: string;
    memberId?: number | null;
    amountCents: number;
    accountName: string;
    paymentMethod: string;
    reference?: string;
    notes?: string;
};

export type DonationRecord = RowDataPacket & {
    id: number;
    donation_date: string;
    donor_name: string;
    donor_email: string | null;
    member_id: number | null;
    amount_cents: number;
    account_name: string;
    payment_method: string;
    reference_number: string | null;
    notes: string | null;
    source: string;
    external_reference: string | null;
    created_at: string;
};

export async function ensureDonationsSchema() {
    await ensureInvoiceSchema();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS donations (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            donation_date DATE NOT NULL,
            donor_name VARCHAR(180) NOT NULL,
            donor_email VARCHAR(180) NULL,
            member_id BIGINT NULL,
            amount_cents BIGINT NOT NULL,
            account_name VARCHAR(120) NOT NULL,
            payment_method VARCHAR(80) NOT NULL,
            reference_number VARCHAR(160) NULL,
            notes VARCHAR(1500) NULL,
            source VARCHAR(30) NOT NULL DEFAULT 'manual',
            external_reference VARCHAR(180) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_donations_date (donation_date),
            INDEX idx_donations_member (member_id),
            INDEX idx_donations_source (source),
            UNIQUE KEY uq_donations_automated_source (source, external_reference)
        )
    `);
}

export function isValidDonationDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date + "T00:00:00Z");
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export async function listDonationAccounts() {
    const accounts = await listInvoicePaymentAccounts();
    return accounts.map((row) => String(row.name));
}

export async function createManualDonation(input: DonationInput) {
    await ensureDonationsSchema();
    const donorName = input.donorName.trim();
    const accountName = input.accountName.trim();
    const paymentMethod = input.paymentMethod.trim();
    const email = (input.donorEmail || "").trim();
    const reference = (input.reference || "").trim();
    const notes = (input.notes || "").trim();
    if (!isValidDonationDate(input.donationDate) || !donorName ||
        donorName.length > 180 || !Number.isSafeInteger(input.amountCents) ||
        input.amountCents <= 0 || email.length > 180 || reference.length > 160 ||
        notes.length > 1500 || !paymentMethod || paymentMethod.length > 80 ||
        (input.memberId != null && (!Number.isSafeInteger(input.memberId) || input.memberId <= 0))) {
        throw new Error("INVALID_DONATION");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_DONATION");
    const accounts = await listDonationAccounts();
    if (!accounts.includes(accountName)) throw new Error("INVALID_ACCOUNT");
    if (input.memberId != null) {
        const [members] = await pool.query<RowDataPacket[]>(
            "SELECT id FROM users WHERE id = ? LIMIT 1", [input.memberId]
        );
        if (members.length !== 1) throw new Error("INVALID_MEMBER");
    }
    const [inserted] = await pool.execute<ResultSetHeader>(`
        INSERT INTO donations
        (donation_date, donor_name, donor_email, member_id, amount_cents,
         account_name, payment_method, reference_number, notes, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
    `, [input.donationDate, donorName, email || null, input.memberId ?? null,
         input.amountCents, accountName, paymentMethod, reference || null, notes || null]);
    return inserted.insertId;
}

export async function listDonations(): Promise<DonationRecord[]> {
    await ensureDonationsSchema();
    const [rows] = await pool.query<DonationRecord[]>(`
        SELECT id, DATE_FORMAT(donation_date, '%Y-%m-%d') AS donation_date,
            donor_name, donor_email, member_id, amount_cents, account_name,
            payment_method, reference_number, notes, source, external_reference, created_at
        FROM donations ORDER BY donation_date DESC, id DESC
    `);
    return rows;
}
