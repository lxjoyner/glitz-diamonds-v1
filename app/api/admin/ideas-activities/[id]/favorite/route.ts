import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { toggleIdeaFavorite } from "@/lib/ideas-activities-db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        const { id } = await params;
        const active = await toggleIdeaFavorite(Number(id), Number(payload.sub));
        return NextResponse.json({ success: true, active });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
