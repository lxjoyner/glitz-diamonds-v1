import pool from "@/lib/db";

export type UserRole = "member" | "secretary" | "treasurer";

export type SiteUser = {
    id: number;
    username: string;
    email: string;
    full_name: string;
    password_hash: string;
    role: UserRole | null;
    is_active: number;
    created_at: string;
    updated_at: string;
};

let bootstrapped = false;

export async function ensureUsersTable() {
    if (bootstrapped) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            full_name VARCHAR(120) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(32) NULL DEFAULT 'member',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_users_role (role),
            INDEX idx_users_is_active (is_active)
        )
    `);

    bootstrapped = true;
}

export async function createRegisteredUser(params: {
    username: string;
    email: string;
    fullName: string;
    passwordHash: string;
}) {
    await ensureUsersTable();

    const [result] = await pool.query(
        `
        INSERT INTO users (username, email, full_name, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, 'member', 1)
        `,
        [params.username, params.email, params.fullName, params.passwordHash]
    );

    return Number((result as { insertId?: number }).insertId || 0);
}

export async function getUserByUsername(username: string): Promise<SiteUser | null> {
    await ensureUsersTable();

    const [rows] = await pool.query(
        `
        SELECT id, username, email, full_name, password_hash, role, is_active, created_at, updated_at
        FROM users
        WHERE username = ?
        LIMIT 1
        `,
        [username]
    );

    return (rows as SiteUser[])[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<SiteUser | null> {
    await ensureUsersTable();

    const [rows] = await pool.query(
        `
        SELECT id, username, email, full_name, password_hash, role, is_active, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [email]
    );

    return (rows as SiteUser[])[0] ?? null;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
    await ensureUsersTable();

    await pool.query(
        `
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
        `,
        [passwordHash, userId]
    );
}

export async function getAllUsers(): Promise<Array<Pick<SiteUser, "id" | "username" | "email" | "full_name" | "role" | "is_active" | "created_at">>> {
    await ensureUsersTable();

    const [rows] = await pool.query(`
        SELECT id, username, email, full_name, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
    `);

    return rows as Array<Pick<SiteUser, "id" | "username" | "email" | "full_name" | "role" | "is_active" | "created_at">>;
}

export async function setUserRole(userId: number, role: UserRole | null) {
    await ensureUsersTable();

    await pool.query(
        `
        UPDATE users
        SET role = ?
        WHERE id = ?
        `,
        [role, userId]
    );
}
