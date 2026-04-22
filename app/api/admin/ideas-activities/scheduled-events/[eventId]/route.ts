import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteScheduledEventById } from "@/lib/ideas-activities-db";

const CAN_DELETE = new Set(["admin", "secretary"]);

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        if (!CAN_DELETE.has(payload.role)) {
            return NextResponse.json({ success: false, error: "Only admins or secretary can remove calendar items." }, { status: 403 });
        }

        const { eventId } = await params;
        const removed = await deleteScheduledEventById(Number(eventId));
        if (!removed) {
            return NextResponse.json({ success: false, error: "Calendar item not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
