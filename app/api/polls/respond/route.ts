import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
    getPollEmailTokenByHash,
    getIdeaById,
    getPollWithOptionsForValidation,
    markPollEmailTokenUsed,
    voteInPoll,
} from "@/lib/ideas-activities-db";
import { getUserById } from "@/lib/user-db";
import { sendPollResponseNotificationEmail } from "@/lib/poll-mailer";

function htmlResponse(status: number, body: string) {
    return new NextResponse(`<!doctype html><html><body style="font-family: Arial, sans-serif; background: #160d23; color: #fff; padding: 24px;"><div style="max-width: 640px; margin: 0 auto; background: #2b193d; border-radius: 12px; padding: 24px;">${body}</div></body></html>`, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

export async function GET(req: NextRequest) {
    try {
        const token = String(req.nextUrl.searchParams.get("token") || "").trim();
        const optionId = Number(req.nextUrl.searchParams.get("optionId") || "0");

        if (!token || !optionId) {
            return htmlResponse(400, "<h1>Invalid vote link</h1><p>Missing token or option selection.</p>");
        }

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const tokenRow = await getPollEmailTokenByHash(tokenHash);

        if (!tokenRow) {
            return htmlResponse(400, "<h1>Vote link not found</h1><p>This link is invalid.</p>");
        }

        if (tokenRow.used_at) {
            return htmlResponse(200, "<h1>Vote already submitted</h1><p>Your poll vote was already recorded.</p>");
        }

        if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
            return htmlResponse(400, "<h1>Vote link expired</h1><p>This link has expired. Please ask an admin to resend the poll.</p>");
        }

        const poll = await getPollWithOptionsForValidation(tokenRow.poll_id);
        if (!poll) {
            return htmlResponse(404, "<h1>Poll not found</h1><p>This poll no longer exists.</p>");
        }

        const selectedOption = poll.options.find((opt) => opt.id === optionId);
        if (!selectedOption) {
            return htmlResponse(400, "<h1>Invalid option</h1><p>The selected option does not belong to this poll.</p>");
        }

        await voteInPoll(tokenRow.poll_id, optionId, tokenRow.user_id);
        await markPollEmailTokenUsed(tokenRow.id);

        const pollResponseInbox = (process.env.POLL_RESPONSE_TO_EMAIL || process.env.CONTACT_TO_WEMAIL || "women@glitzofdiamonds.com").trim();
        if (pollResponseInbox) {
            const respondent = await getUserById(tokenRow.user_id);
            const idea = await getIdeaById(poll.idea_id);
            const ideaTitle = idea?.title || process.env.POLL_RESPONSE_IDEA_TITLE_FALLBACK || "Ideas & Activities Poll";

            try {
                await sendPollResponseNotificationEmail({
                    toEmail: pollResponseInbox,
                    respondentName: respondent?.full_name || respondent?.email || `User #${tokenRow.user_id}`,
                    respondentEmail: respondent?.email || `user-${tokenRow.user_id}@unknown.local`,
                    ideaTitle,
                    question: poll.question,
                    selectedOption: selectedOption.option_label,
                });
            } catch (mailError) {
                console.error("Poll vote recorded, but failed to send poll response notification email", mailError);
            }
        }

        return htmlResponse(200, `<h1>Thank you for voting</h1><p>Your vote has been counted for: <strong>${selectedOption.option_label}</strong>.</p><p>You can close this page now.</p>`);
    } catch (error) {
        console.error("Failed to process poll vote response", error);
        return htmlResponse(500, "<h1>Something went wrong</h1><p>We could not record your vote right now. Please try again later.</p>");
    }
}
