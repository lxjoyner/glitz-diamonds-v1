import pool from "@/lib/db";
import { getChicagoDateKey } from "@/lib/timezone";

export async function insertPageVisit(input: {
    pagePath: string;
    visitorKey?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}) {
    await pool.execute(
        `
        INSERT INTO page_visits (page_path, visitor_key, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
        `,
        [
            input.pagePath,
            input.visitorKey ?? null,
            input.ipAddress ?? null,
            input.userAgent ?? null,
        ]
    );
}

export async function getTodayVisitCount(): Promise<number> {
    const today = getChicagoDateKey();

    const [rows] = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM page_visits
        WHERE DATE(CONVERT_TZ(created_at, "+00:00", "America/Chicago")) = ?
        `,
        [today]
    );

    const result = rows as { count: number }[];
    return result[0]?.count ?? 0;
}

export async function getTotalVisitCount(): Promise<number> {
    const [rows] = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM page_visits
        `
    );

    const result = rows as { count: number }[];
    return result[0]?.count ?? 0;
}
