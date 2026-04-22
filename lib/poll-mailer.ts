import path from "path";
import { writeEmailLog } from "@/lib/email-log";
import { getSmtpTransport } from "@/lib/mailer";

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function sendPollInvitationEmail(params: {
    toEmail: string;
    recipientName: string;
    ideaTitle: string;
    question: string;
    options: Array<{ label: string; voteUrl: string }>;
}) {
    const fromEmail = process.env.PASSWORD_RESET_FROM_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER;

    if (!fromEmail) {
        writeEmailLog({
            channel: "poll-email",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_from_email",
        });
        return { sent: false as const, reason: "missing_from_email" as const };
    }

    const subject = `New Poll: ${params.ideaTitle}`;

    writeEmailLog({
        channel: "poll-email",
        status: "attempt",
        to: params.toEmail,
        subject,
    });

    try {
        const transporter = getSmtpTransport();
        const safeRecipientName = escapeHtml(params.recipientName);
        const safeIdeaTitle = escapeHtml(params.ideaTitle);
        const safeQuestion = escapeHtml(params.question);
        const optionButtons = params.options
            .map((option) => {
                const safeLabel = escapeHtml(option.label);
                const safeVoteUrl = escapeHtml(option.voteUrl);

                return `
                    <tr>
                        <td style="padding:0 0 12px 0;">
                            <a href="${safeVoteUrl}" style="display:block;text-decoration:none;background:linear-gradient(90deg,#3b0000 0%,#7f1d1d 45%,#b91c1c 100%);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:14px 16px;color:#ffffff;font-size:15px;font-weight:700;text-align:center;">
                                Vote: ${safeLabel}
                            </a>
                        </td>
                    </tr>
                `;
            })
            .join("");

        const logoPath = path.join(process.cwd(), "public", "GlitzOfDiamond_Logo.png");
        const logoAttachment = [
            {
                filename: "GlitzOfDiamond_Logo.png",
                path: logoPath,
                cid: "glitz-logo",
            },
        ];

        await transporter.sendMail({
            from: `"Glitz Of Diamonds Polls" <${fromEmail}>`,
            to: params.toEmail,
            subject,
            attachments: logoAttachment,
            text: `Hi ${params.recipientName},\n\nA new poll is available for ${params.ideaTitle}.\n\nQuestion: ${params.question}\n\n${params.options.map((opt, idx) => `${idx + 1}. ${opt.label}: ${opt.voteUrl}`).join("\n")}\n\nSelect one option link to cast your vote.`,
            html: `
                <div style="background:#090909;padding:36px 20px;font-family:Arial,sans-serif;color:#f8fafc;">
                    <div style="max-width:720px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);">
                        <div style="padding:22px 26px;background:linear-gradient(90deg,#3b0000 0%,#7f1d1d 45%,#b91c1c 100%);border-bottom:1px solid rgba(255,255,255,.08);">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                                <tr>
                                    <td style="width:120px;vertical-align:middle;">
                                        <img src="cid:glitz-logo" alt="Glitz Of Diamonds logo" style="display:block;max-width:105px;height:auto;" />
                                    </td>
                                    <td style="vertical-align:middle;padding-left:14px;">
                                        <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;letter-spacing:.4px;">Glitz Of Diamonds</h1>
                                        <p style="margin:6px 0 0 0;color:#ffe4e6;font-size:14px;line-height:1.4;">New member poll is ready</p>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div style="padding:28px 26px;">
                            <p style="margin:0 0 14px 0;color:#ffffff;font-size:16px;">Hi ${safeRecipientName},</p>
                            <p style="margin:0 0 16px 0;line-height:1.8;color:#e5e7eb;font-size:15px;">
                                Please vote in the latest poll for <strong>${safeIdeaTitle}</strong>.
                            </p>

                            <div style="margin-top:18px;padding:20px;background:#0b0b0b;border:1px solid rgba(255,255,255,.08);border-radius:14px;">
                                <p style="margin:0 0 10px 0;font-size:14px;font-weight:700;letter-spacing:.3px;color:#ffffff;text-transform:uppercase;">Poll Question</p>
                                <p style="margin:0;line-height:1.8;color:#e5e7eb;font-size:15px;">${safeQuestion}</p>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:20px;">
                                ${optionButtons}
                            </table>

                            <p style="margin:10px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
                                Selecting one option records your response. Each member can submit one vote.
                            </p>
                        </div>

                        <div style="padding:18px 26px;background:#0d0d0d;border-top:1px solid rgba(255,255,255,.06);">
                            <p style="margin:0;color:#cbd5e1;font-size:14px;">Glitz Of Diamonds</p>
                            <p style="margin:6px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">This is an automated poll notification email.</p>
                        </div>
                    </div>
                </div>
            `,
        });

        writeEmailLog({
            channel: "poll-email",
            status: "success",
            to: params.toEmail,
            subject,
        });

        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "poll-email",
            status: "error",
            to: params.toEmail,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}
