import { getTodayContactCount } from "@/lib/contact-db";
import { getTodayVisitCount } from "@/lib/visit-db";

export async function GET() {
    try {
        const [visitsToday, contactsToday] = await Promise.all([
            getTodayVisitCount(),
            getTodayContactCount(),
        ]);

        return Response.json({
            success: true,
            visitsToday,
            contactsToday,
        });
    } catch (error) {
        console.error("Stats API error:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to load stats.",
                visitsToday: 0,
                contactsToday: 0,
            },
            { status: 500 }
        );
    }
}