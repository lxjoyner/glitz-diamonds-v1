import { insertPageVisit } from "@/lib/visit-db";

export async function POST(req: Request) {
    try {
        const { path, visitorKey } = await req.json();
        const forwardedFor = req.headers.get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim() || undefined;
        const userAgent = req.headers.get("user-agent") || undefined;

        await insertPageVisit({
            pagePath: typeof path === "string" ? path : "/",
            visitorKey: typeof visitorKey === "string" ? visitorKey : null,
            ipAddress: ip,
            userAgent,
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error("Track visit error:", error);
        return Response.json({ success: false }, { status: 500 });
    }
}