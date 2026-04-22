import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { voteInPoll } from "@/lib/ideas-activities-db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        const { pollId } = await params;
        const body = await req.json();
        const optionId = Number(body.optionId || 0);

        if (!optionId) {
            return NextResponse.json({ success: false, error: "optionId is required." }, { status: 400 });
        }

        await voteInPoll(Number(pollId), optionId, Number(payload.sub));
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
