import pool from "@/lib/db";

export async function GET() {
    try {
        const [rows] = await pool.query("SELECT 1 AS ok");
        return Response.json({ success: true, rows });
    } catch (error) {
        console.error("DB test failed:", error);
        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "DB error",
            },
            { status: 500 }
        );
    }
}