import pool from "@/lib/db";
import { getChicagoDateKey } from "@/lib/timezone";

export type ContactMessage = {
    id: number;
    name: string;
    email: string;
    message: string;
    ip_address: string | null;
    created_at: string;
    processed_at: string | null;
    is_spam: number;
};

export async function insertContactMessage(input: {
    name: string;
    email: string;
    message: string;
    ipAddress?: string | null;
    isSpam?: boolean;
}) {
    const [result] = await pool.execute(
        `
        INSERT INTO contact_messages (name, email, message, ip_address, is_spam)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            input.name,
            input.email,
            input.message,
            input.ipAddress ?? null,
            input.isSpam ? 1 : 0,
        ]
    );

    return result;
}

export async function getAllContactMessages(): Promise<ContactMessage[]> {
    const [rows] = await pool.query(
        `
        SELECT id, name, email, message, ip_address, created_at, processed_at, is_spam
        FROM contact_messages
        ORDER BY created_at DESC
        `
    );

    return rows as ContactMessage[];
}

export async function getContactMessageById(id: number): Promise<ContactMessage | null> {
    const [rows] = await pool.query(
        `
        SELECT id, name, email, message, ip_address, created_at, processed_at, is_spam
        FROM contact_messages
        WHERE id = ?
        LIMIT 1
        `,
        [id]
    );

    const items = rows as ContactMessage[];
    return items[0] ?? null;
}

export async function deleteContactMessageById(id: number): Promise<boolean> {
    const [result] = await pool.execute(
        `
        DELETE FROM contact_messages
        WHERE id = ?
        `,
        [id]
    );

    const deleteResult = result as { affectedRows?: number };
    return (deleteResult.affectedRows ?? 0) > 0;
}

export async function getTodayContactCount(): Promise<number> {
    const today = getChicagoDateKey();

    const [rows] = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM contact_messages
        WHERE DATE(CONVERT_TZ(created_at, "+00:00", "America/Chicago")) = ?
          AND is_spam = 0
        `,
        [today]
    );

    const result = rows as { count: number }[];
    return result[0]?.count ?? 0;
}

export async function getTotalContactCount(): Promise<number> {
    const [rows] = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM contact_messages
        WHERE is_spam = 0
        `
    );

    const result = rows as { count: number }[];
    return result[0]?.count ?? 0;
}
