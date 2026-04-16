import pool from "@/lib/db";

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
    const today = new Date().toISOString().slice(0, 10);

    const [rows] = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM page_visits
        WHERE DATE(created_at) = ?
        `,
        [today]
    );

    const result = rows as { count: number }[];
    return result[0]?.count ?? 0;
}