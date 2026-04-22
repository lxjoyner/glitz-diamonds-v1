import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deletePollById } from "@/lib/ideas-activities-db";

const CAN_DELETE = new Set(["admin", "secretary"]);

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        if (!CAN_DELETE.has(payload.role)) {
            return NextResponse.json({ success: false, error: "Only admins or secretary can remove polls." }, { status: 403 });
        }

        const { pollId } = await params;
        const removed = await deletePollById(Number(pollId));
        if (!removed) {
            return NextResponse.json({ success: false, error: "Poll not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
