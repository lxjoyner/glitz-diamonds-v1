import pool from "@/lib/db";

export type AdminUser = {
    id: number;
    username: string;
    password_hash: string;
    role: string;
    is_active: number;
    created_at: string;
};

export async function getAdminByUsername(username: string): Promise<AdminUser | null> {
    const [rows] = await pool.query(
        `
        SELECT id, username, password_hash, role, is_active, created_at
        FROM admins
        WHERE username = ?
        LIMIT 1
        `,
        [username]
    );

    const result = rows as AdminUser[];
    return result[0] ?? null;
}