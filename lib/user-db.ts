import pool from "@/lib/db";

export type UserRole = "member" | "secretary" | "treasurer" | "admin";

export type SiteUser = {
    id: number;
    username: string;
    email: string;
    full_name: string;
    password_hash: string;
    address: string;
    tshirt_size: string;
    favorite_color: string;
    hat_size: string;
    gender: string;
    birthday: string;
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
            address VARCHAR(255) NOT NULL DEFAULT '',
            tshirt_size VARCHAR(8) NOT NULL DEFAULT 'MD',
            favorite_color VARCHAR(64) NOT NULL DEFAULT '',
            hat_size VARCHAR(32) NOT NULL DEFAULT '',
            gender VARCHAR(16) NOT NULL DEFAULT '',
            birthday CHAR(8) NOT NULL DEFAULT '',
            role VARCHAR(32) NULL DEFAULT 'member',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_users_role (role),
            INDEX idx_users_is_active (is_active)
        )
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tshirt_size VARCHAR(8) NOT NULL DEFAULT 'MD'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_color VARCHAR(64) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hat_size VARCHAR(32) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(16) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday CHAR(8) NOT NULL DEFAULT ''`);

    bootstrapped = true;
}

export async function createRegisteredUser(params: {
    username: string;
    email: string;
    fullName: string;
    passwordHash: string;
    address: string;
    tshirtSize: string;
    favoriteColor: string;
    hatSize: string;
    gender: string;
    birthday: string;
}) {
    await ensureUsersTable();

    const [result] = await pool.query(
        `
        INSERT INTO users (
            username, email, full_name, password_hash, address, tshirt_size, favorite_color, hat_size, gender, birthday, role, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'member', 1)
        `,
        [
            params.username,
            params.email,
            params.fullName,
            params.passwordHash,
            params.address,
            params.tshirtSize,
            params.favoriteColor,
            params.hatSize,
            params.gender,
            params.birthday,
        ]
    );

    return Number((result as { insertId?: number }).insertId || 0);
}

export async function getUserByUsername(username: string): Promise<SiteUser | null> {
    await ensureUsersTable();

    const [rows] = await pool.query(
        `
        SELECT
            id, username, email, full_name, password_hash, address, tshirt_size, favorite_color, hat_size, gender, birthday,
            role, is_active, created_at, updated_at
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
        SELECT
            id, username, email, full_name, password_hash, address, tshirt_size, favorite_color, hat_size, gender, birthday,
            role, is_active, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [email]
    );

    return (rows as SiteUser[])[0] ?? null;
}

export async function getUserById(userId: number): Promise<SiteUser | null> {
    await ensureUsersTable();

    const [rows] = await pool.query(
        `
        SELECT
            id, username, email, full_name, password_hash, address, tshirt_size, favorite_color, hat_size, gender, birthday,
            role, is_active, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
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

export async function getAllUsers(): Promise<Array<Pick<SiteUser, "id" | "username" | "email" | "full_name" | "address" | "tshirt_size" | "favorite_color" | "hat_size" | "gender" | "birthday" | "role" | "is_active" | "created_at">>> {
    await ensureUsersTable();

    const [rows] = await pool.query(`
        SELECT id, username, email, full_name, address, tshirt_size, favorite_color, hat_size, gender, birthday, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
    `);

    return rows as Array<Pick<SiteUser, "id" | "username" | "email" | "full_name" | "address" | "tshirt_size" | "favorite_color" | "hat_size" | "gender" | "birthday" | "role" | "is_active" | "created_at">>;
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

export async function deleteUserById(userId: number) {
    await ensureUsersTable();

    const [result] = await pool.query(
        `
        DELETE FROM users
        WHERE id = ?
        `,
        [userId]
    );

    return Number((result as { affectedRows?: number }).affectedRows || 0);
}

export async function getUserForAdminSync(userId: number): Promise<Pick<SiteUser, "id" | "username" | "password_hash" | "is_active"> | null> {
    await ensureUsersTable();

    const [rows] = await pool.query(
        `
        SELECT id, username, password_hash, is_active
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
    );

    return ((rows as Array<Pick<SiteUser, "id" | "username" | "password_hash" | "is_active">>)[0]) ?? null;
}

export async function getActiveUsersForPollEmails(): Promise<Array<Pick<SiteUser, "id" | "email" | "full_name" | "role">>> {
    await ensureUsersTable();
    const [rows] = await pool.query(
        `
        SELECT id, email, full_name, role
        FROM users
        WHERE is_active = 1
          AND email IS NOT NULL
          AND TRIM(email) <> ''
          AND COALESCE(LOWER(role), 'member') IN ('member', 'secretary', 'treasurer', 'admin')
        ORDER BY full_name ASC
        `
    );

    return rows as Array<Pick<SiteUser, "id" | "email" | "full_name" | "role">>;
}
