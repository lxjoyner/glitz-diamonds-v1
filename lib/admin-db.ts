import crypto from "node:crypto";
import pool from "@/lib/db";

export type AdminUser = {
    id: number;
    username: string;
    email: string | null;
    password_hash: string;
    role: string;
    is_active: number;
    created_at: string;
};

type AdminSecurityState = {
    password_changed_at: string;
    reset_required: number;
    last_reset_email_sent_at: string | null;
    reset_email: string | null;
};

export type AdminResetToken = {
    id: number;
    admin_id: number;
    token_hash: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
};

export type LoginVerificationChallenge = {
    id: number;
    user_id: number;
    user_type: "admin" | "user";
    username: string;
    role: string;
    email: string;
    code_hash: string;
    challenge_hash: string;
    expires_at: string;
    consumed_at: string | null;
    created_at: string;
};

let bootstrapped = false;

async function ensureAdminSecurityTables() {
    if (bootstrapped) {
        return;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_security (
            admin_id INT PRIMARY KEY,
            reset_email VARCHAR(255) NULL,
            password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reset_required TINYINT(1) NOT NULL DEFAULT 0,
            last_reset_email_sent_at DATETIME NULL,
            FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            token_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_token_hash (token_hash),
            INDEX idx_admin_expires (admin_id, expires_at),
            FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_login_verification_challenges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            user_type ENUM('admin', 'user') NOT NULL,
            username VARCHAR(64) NOT NULL,
            role VARCHAR(32) NOT NULL,
            email VARCHAR(255) NOT NULL,
            code_hash VARCHAR(64) NOT NULL,
            challenge_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            consumed_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_challenge_hash (challenge_hash),
            INDEX idx_login_verify_lookup (challenge_hash, expires_at, consumed_at),
            INDEX idx_login_verify_user (user_id, user_type, created_at)
        )
    `);

    bootstrapped = true;
}

async function ensureAdminSecurityRow(adminId: number) {
    await ensureAdminSecurityTables();

    await pool.query(
        `
        INSERT INTO admin_security (admin_id)
        VALUES (?)
        ON DUPLICATE KEY UPDATE admin_id = admin_id
        `,
        [adminId]
    );
}

export async function getAdminByUsername(username: string): Promise<AdminUser | null> {
    await ensureAdminSecurityTables();

    const [rows] = await pool.query(
        `
        SELECT
            a.id,
            a.username,
            COALESCE(NULLIF(TRIM(s.reset_email), ''), NULLIF(TRIM(u.email), '')) AS email,
            a.password_hash,
            a.role,
            a.is_active,
            a.created_at
        FROM admins a
        LEFT JOIN admin_security s ON s.admin_id = a.id
        LEFT JOIN users u ON u.username = a.username
        WHERE a.username = ?
        LIMIT 1
        `,
        [username]
    );

    const result = rows as AdminUser[];
    return result[0] ?? null;
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
    await ensureAdminSecurityTables();

    const [rows] = await pool.query(
        `
        SELECT
            a.id,
            a.username,
            COALESCE(NULLIF(TRIM(s.reset_email), ''), NULLIF(TRIM(u.email), '')) AS email,
            a.password_hash,
            a.role,
            a.is_active,
            a.created_at
        FROM admins a
        LEFT JOIN admin_security s ON s.admin_id = a.id
        LEFT JOIN users u ON u.username = a.username
        WHERE s.reset_email = ? OR u.email = ?
        LIMIT 1
        `,
        [email, email]
    );

    const result = rows as AdminUser[];
    return result[0] ?? null;
}

export async function getAdminNotificationEmails(): Promise<string[]> {
    await ensureAdminSecurityTables();

    const [rows] = await pool.query(
        `
        SELECT DISTINCT s.reset_email AS email
        FROM admins a
        JOIN admin_security s ON s.admin_id = a.id
        WHERE a.role = 'admin'
          AND a.is_active = 1
          AND s.reset_email IS NOT NULL
          AND TRIM(s.reset_email) <> ''
        `
    );

    const records = rows as Array<{ email: string | null }>;
    return records
        .map((record) => record.email?.trim() ?? "")
        .filter(Boolean);
}

export async function upsertAdminUser(params: {
    username: string;
    passwordHash: string;
    isActive: number;
}) {
    await ensureAdminSecurityTables();

    await pool.query(
        `
        INSERT INTO admins (username, password_hash, role, is_active)
        VALUES (?, ?, 'admin', ?)
        ON DUPLICATE KEY UPDATE
            password_hash = VALUES(password_hash),
            role = 'admin',
            is_active = VALUES(is_active)
        `,
        [params.username, params.passwordHash, params.isActive]
    );
}

export async function removeAdminByUsername(username: string) {
    await ensureAdminSecurityTables();

    await pool.query(
        `
        DELETE FROM admins
        WHERE username = ?
        `,
        [username]
    );
}

export async function getAdminSecurityState(adminId: number): Promise<AdminSecurityState> {
    await ensureAdminSecurityRow(adminId);

    const [rows] = await pool.query(
        `
        SELECT reset_email, password_changed_at, reset_required, last_reset_email_sent_at
        FROM admin_security
        WHERE admin_id = ?
        LIMIT 1
        `,
        [adminId]
    );

    const record = (rows as AdminSecurityState[])[0];

    return record;
}

export async function setAdminResetEmail(adminId: number, email: string) {
    await ensureAdminSecurityRow(adminId);

    await pool.query(
        `
        UPDATE admin_security
        SET reset_email = ?
        WHERE admin_id = ?
        `,
        [email, adminId]
    );
}

export async function markResetEmailSent(adminId: number) {
    await ensureAdminSecurityRow(adminId);

    await pool.query(
        `
        UPDATE admin_security
        SET last_reset_email_sent_at = NOW(), reset_required = 1
        WHERE admin_id = ?
        `,
        [adminId]
    );
}


export async function setAdminTemporaryPassword(adminId: number, passwordHash: string) {
    await ensureAdminSecurityRow(adminId);

    await pool.query(
        `
        UPDATE admins
        SET password_hash = ?
        WHERE id = ?
        `,
        [passwordHash, adminId]
    );

    await pool.query(
        `
        UPDATE admin_security
        SET reset_required = 1, last_reset_email_sent_at = NOW()
        WHERE admin_id = ?
        `,
        [adminId]
    );
}

export async function updateAdminPassword(adminId: number, passwordHash: string) {
    await ensureAdminSecurityRow(adminId);

    await pool.query(
        `
        UPDATE admins
        SET password_hash = ?
        WHERE id = ?
        `,
        [passwordHash, adminId]
    );

    await pool.query(
        `
        UPDATE admin_security
        SET password_changed_at = NOW(), reset_required = 0, last_reset_email_sent_at = NULL
        WHERE admin_id = ?
        `,
        [adminId]
    );
}

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(adminId: number, ttlMinutes = 60) {
    await ensureAdminSecurityRow(adminId);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await pool.query(
        `
        INSERT INTO admin_password_reset_tokens (admin_id, token_hash, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
        `,
        [adminId, tokenHash, ttlMinutes]
    );

    return rawToken;
}

export async function consumePasswordResetToken(rawToken: string): Promise<AdminResetToken | null> {
    await ensureAdminSecurityTables();

    const tokenHash = hashToken(rawToken);

    const [rows] = await pool.query(
        `
        SELECT id, admin_id, token_hash, expires_at, used_at, created_at
        FROM admin_password_reset_tokens
        WHERE token_hash = ?
        LIMIT 1
        `,
        [tokenHash]
    );

    const token = (rows as AdminResetToken[])[0];

    if (!token) {
        return null;
    }

    if (token.used_at || new Date(token.expires_at).getTime() < Date.now()) {
        return null;
    }

    await pool.query(
        `
        UPDATE admin_password_reset_tokens
        SET used_at = NOW()
        WHERE id = ?
        `,
        [token.id]
    );

    return token;
}

export async function createLoginVerificationChallenge(params: {
    userId: number;
    userType: "admin" | "user";
    username: string;
    role: string;
    email: string;
    code: string;
    ttlMinutes?: number;
}) {
    await ensureAdminSecurityTables();

    const rawChallengeToken = crypto.randomBytes(32).toString("hex");
    const challengeHash = hashToken(rawChallengeToken);
    const codeHash = hashToken(params.code);
    const ttlMinutes = params.ttlMinutes ?? 10;

    await pool.query(
        `
        INSERT INTO admin_login_verification_challenges (
            user_id, user_type, username, role, email, code_hash, challenge_hash, expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
        `,
        [
            params.userId,
            params.userType,
            params.username,
            params.role,
            params.email,
            codeHash,
            challengeHash,
            ttlMinutes,
        ]
    );

    return rawChallengeToken;
}

export async function consumeLoginVerificationChallenge(rawChallengeToken: string, code: string): Promise<LoginVerificationChallenge | null> {
    await ensureAdminSecurityTables();

    const challengeHash = hashToken(rawChallengeToken);
    const codeHash = hashToken(code);

    const [rows] = await pool.query(
        `
        SELECT id, user_id, user_type, username, role, email, code_hash, challenge_hash, expires_at, consumed_at, created_at
        FROM admin_login_verification_challenges
        WHERE challenge_hash = ?
        LIMIT 1
        `,
        [challengeHash]
    );

    const challenge = (rows as LoginVerificationChallenge[])[0];

    if (!challenge) {
        return null;
    }

    if (challenge.consumed_at || new Date(challenge.expires_at).getTime() < Date.now()) {
        return null;
    }

    if (challenge.code_hash !== codeHash) {
        return null;
    }

    await pool.query(
        `
        UPDATE admin_login_verification_challenges
        SET consumed_at = NOW()
        WHERE id = ?
        `,
        [challenge.id]
    );

    return challenge;
}
