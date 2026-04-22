import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createPollForIdea, getIdeaPolls } from "@/lib/ideas-activities-db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        const { id } = await params;
        const polls = await getIdeaPolls(Number(id), Number(payload.sub));
        return NextResponse.json({ success: true, polls });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const payload = verifyAdminToken(token);
        const { id } = await params;
        const body = await req.json();
        const question = String(body.question || "").trim();
        const options = Array.isArray(body.options)
            ? (body.options as unknown[]).map((opt: unknown) => String(opt || "").trim()).filter(Boolean)
            : [];

        if (!question || options.length < 2) {
            return NextResponse.json({ success: false, error: "Poll question and at least two options are required." }, { status: 400 });
        }

        const pollId = await createPollForIdea({
            ideaId: Number(id),
            question,
            options,
            createdByUserId: Number(payload.sub),
        });

        return NextResponse.json({ success: true, pollId });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
