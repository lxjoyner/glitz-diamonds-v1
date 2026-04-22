import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createScheduledEvent } from "@/lib/ideas-activities-db";

const CAN_SCHEDULE = new Set(["admin", "secretary"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        if (!CAN_SCHEDULE.has(payload.role)) {
            return NextResponse.json({ success: false, error: "Only admins or secretary can schedule events." }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const startDate = String(body.startDate || "").trim();
        const endDate = String(body.endDate || "").trim();
        const title = String(body.title || "").trim();
        const location = String(body.location || "").trim();

        if (!startDate || !endDate || !title || !location) {
            return NextResponse.json({ success: false, error: "Missing schedule fields." }, { status: 400 });
        }

        await createScheduledEvent({
            ideaId: Number(id),
            title,
            startDate,
            endDate,
            location,
            createdByUserId: Number(payload.sub),
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
