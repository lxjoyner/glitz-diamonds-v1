import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import crypto from "node:crypto";
import {
    createPollForIdea,
    getIdeaById,
    getIdeaPolls,
    getPollWithOptionsForValidation,
    upsertPollEmailToken,
} from "@/lib/ideas-activities-db";
import { getActiveUsersForPollEmails } from "@/lib/user-db";
import { sendPollEmail } from "@/lib/mailer";

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
        const idea = await getIdeaById(Number(id));

        const createdPoll = await getPollWithOptionsForValidation(pollId);
        if (!createdPoll) {
            return NextResponse.json({ success: false, error: "Poll was created but could not be loaded." }, { status: 500 });
        }

        const activeUsers = await getActiveUsersForPollEmails();
        const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 19).replace("T", " ");
        let emailsSent = 0;

        for (const member of activeUsers) {
            const plainToken = crypto.randomBytes(32).toString("hex");
            const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");

            await upsertPollEmailToken({
                pollId,
                userId: member.id,
                tokenHash,
                expiresAt,
            });

            const emailOptions = createdPoll.options.map((opt) => ({
                label: opt.option_label,
                voteUrl: `${appBaseUrl}/api/polls/respond?token=${encodeURIComponent(plainToken)}&optionId=${opt.id}`,
            }));

            const result = await sendPollEmail({
                toEmail: member.email,
                recipientName: member.full_name || member.email,
                ideaTitle: idea?.title || `Idea #${id}`,
                question,
                options: emailOptions,
            });

            if (result.sent) {
                emailsSent += 1;
            }
        }

        return NextResponse.json({ success: true, pollId, emailsSent, recipients: activeUsers.length });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
