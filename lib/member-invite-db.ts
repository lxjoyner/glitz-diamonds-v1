import crypto from "crypto";
import pool from "@/lib/db";

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

    bootstrapped = true;
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
