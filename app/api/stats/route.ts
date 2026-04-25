import { getTodayContactCount, getTotalContactCount } from "@/lib/contact-db";
import { getTodayVisitCount, getTotalVisitCount } from "@/lib/visit-db";

export async function GET() {
    try {
        const [visitsToday, contactsToday, visitsTotal, contactsTotal] = await Promise.all([
            getTodayVisitCount(),
            getTodayContactCount(),
            getTotalVisitCount(),
            getTotalContactCount(),
        ]);

        return Response.json({
            success: true,
            visitsToday,
            contactsToday,
            visitsTotal,
            contactsTotal,
        });
    } catch (error) {
        console.error("Stats API error:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to load stats.",
                visitsToday: 0,
                contactsToday: 0,
                visitsTotal: 0,
                contactsTotal: 0,
            },
            { status: 500 }
        );
    }
}
