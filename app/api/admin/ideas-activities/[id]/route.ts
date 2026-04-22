import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteIdeaActivityById } from "@/lib/ideas-activities-db";

const CAN_DELETE = new Set(["admin", "secretary"]);

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        if (!CAN_DELETE.has(payload.role)) {
            return NextResponse.json({ success: false, error: "Only admins or secretary can remove ideas." }, { status: 403 });
        }

        const { id } = await params;
        const removed = await deleteIdeaActivityById(Number(id));
        if (!removed) {
            return NextResponse.json({ success: false, error: "Idea not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
