import crypto from "crypto";
import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

let bootstrapped = false;

function hashInviteToken(inviteToken: string): string {
    return crypto.createHash("sha256").update(inviteToken).digest("hex");
}

async function ensureMemberInviteUsageTable() {
    if (bootstrapped) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS member_invite_usage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token_hash CHAR(64) NOT NULL UNIQUE,
            invited_email VARCHAR(255) NOT NULL DEFAULT '',
            consumed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_member_invite_usage_email (invited_email)
        )
    `);

    await pool.query(`ALTER TABLE member_invite_usage ADD COLUMN IF NOT EXISTS invited_email VARCHAR(255) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE member_invite_usage ADD COLUMN IF NOT EXISTS consumed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS member_invites (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            token_hash CHAR(64) NOT NULL UNIQUE,
            invited_by_username VARCHAR(180) NOT NULL,
            invited_by_admin_id BIGINT NULL,
            first_name VARCHAR(120) NOT NULL,
            last_name VARCHAR(120) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone_number VARCHAR(30) NOT NULL,
            invite_url TEXT NOT NULL,
            email_sent_at DATETIME NULL,
            email_opened_at DATETIME NULL,
            registration_completed_at DATETIME NULL,
            registered_user_id BIGINT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_member_invites_email (email),
            INDEX idx_member_invites_invited_by (invited_by_username),
            INDEX idx_member_invites_created_at (created_at)
        )
    `);

    bootstrapped = true;
}

export async function createMemberInviteRecord(input: {
    inviteToken: string;
    invitedByUsername: string;
    invitedByAdminId?: number | null;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    inviteUrl: string;
    emailSent: boolean;
}) {
    await ensureMemberInviteUsageTable();
    const tokenHash = hashInviteToken(input.inviteToken);
    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO member_invites (
            token_hash, invited_by_username, invited_by_admin_id, first_name, last_name,
            email, phone_number, invite_url, email_sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${input.emailSent ? "NOW()" : "NULL"})
        ON DUPLICATE KEY UPDATE
            invited_by_username = VALUES(invited_by_username),
            invited_by_admin_id = VALUES(invited_by_admin_id),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            email = VALUES(email),
            phone_number = VALUES(phone_number),
            invite_url = VALUES(invite_url),
            email_sent_at = IF(VALUES(email_sent_at) IS NOT NULL, VALUES(email_sent_at), email_sent_at)
    `, [
        tokenHash,
        input.invitedByUsername,
        input.invitedByAdminId ?? null,
        input.firstName,
        input.lastName,
        input.email,
        input.phoneNumber,
        input.inviteUrl,
    ]);
    return result.insertId;
}

export async function listMemberInvites() {
    await ensureMemberInviteUsageTable();
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, invited_by_username, first_name, last_name, email, phone_number,
               email_sent_at, email_opened_at, registration_completed_at, registered_user_id, created_at
        FROM member_invites
        ORDER BY created_at DESC, id DESC
    `);
    return rows;
}

export async function markMemberInviteEmailOpened(trackingToken: string) {
    await ensureMemberInviteUsageTable();
    const tokenHash = hashInviteToken(trackingToken);
    await pool.execute(`
        UPDATE member_invites
        SET email_opened_at = COALESCE(email_opened_at, NOW())
        WHERE token_hash = ?
    `, [tokenHash]);
}

export async function markMemberInviteRegistrationCompleted(inviteToken: string, registeredUserId?: number | null) {
    await ensureMemberInviteUsageTable();
    const tokenHash = hashInviteToken(inviteToken);
    await pool.execute(`
        UPDATE member_invites
        SET registration_completed_at = COALESCE(registration_completed_at, NOW()),
            registered_user_id = COALESCE(registered_user_id, ?)
        WHERE token_hash = ?
    `, [registeredUserId ?? null, tokenHash]);
}

export async function isMemberInviteTokenConsumed(inviteToken: string): Promise<boolean> {
    await ensureMemberInviteUsageTable();

    const tokenHash = hashInviteToken(inviteToken);

    const [rows] = await pool.query(
        `
        SELECT id
        FROM member_invite_usage
        WHERE token_hash = ?
        LIMIT 1
        `,
        [tokenHash]
    );

    return (rows as Array<{ id: number }>).length > 0;
}

export async function consumeMemberInviteToken(inviteToken: string, invitedEmail: string): Promise<boolean> {
    await ensureMemberInviteUsageTable();

    const tokenHash = hashInviteToken(inviteToken);

    try {
        const [result] = await pool.query(
            `
            INSERT INTO member_invite_usage (token_hash, invited_email)
            VALUES (?, ?)
            `,
            [tokenHash, invitedEmail]
        );

        return Number((result as { affectedRows?: number }).affectedRows || 0) > 0;
    } catch (error) {
        if ((error as { code?: string })?.code === "ER_DUP_ENTRY") {
            return false;
        }

        throw error;
    }
}
