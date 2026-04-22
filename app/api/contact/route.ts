import path from "path";
import { insertContactMessage } from "@/lib/contact-db";
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

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
    try {
        const { name, email, message, company } = await req.json();

        const cleanName = String(name || "").trim();
        const cleanEmail = String(email || "").trim();
        const cleanMessage = String(message || "").trim();
        const honeypot = String(company || "").trim();

        if (honeypot) {
            return Response.json({ success: true });
        }

        if (!cleanName || !cleanEmail || !cleanMessage) {
            return Response.json(
                { success: false, error: "All fields are required." },
                { status: 400 }
            );
        }

        if (!isValidEmail(cleanEmail)) {
            return Response.json(
                { success: false, error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        if (cleanMessage.length < 5) {
            return Response.json(
                { success: false, error: "Message is too short." },
                { status: 400 }
            );
        }

        const transporter = getSmtpTransport();
        const fromEmail = process.env.PASSWORD_RESET_FROM_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER;

        if (!fromEmail) {
            throw new Error("Missing environment variable: PASSWORD_RESET_FROM_EMAIL or SMTP_USER");
        }

        writeEmailLog({
            channel: "contact-admin-notification",
            status: "attempt",
            to: process.env.CONTACT_TO_EMAIL || fromEmail,
            subject: `New Contact Form Message from ${cleanName}`,
        });

        await transporter.verify();

        const safeName = escapeHtml(cleanName);
        const safeEmail = escapeHtml(cleanEmail);
        const safeMessage = escapeHtml(cleanMessage).replaceAll("\n", "<br />");

        const logoPath = path.join(process.cwd(), "public", "GlitzOfDiamond_Logo.png");

        const logoAttachment = [
            {
                filename: "GlitzOfDiamond_Logo.png",
                path: logoPath,
                cid: "glitz-logo",
            },
        ];

        await transporter.sendMail({
            from: `"Glitz Of Diamonds Contact Form" <${fromEmail}>`,
            to: process.env.CONTACT_TO_EMAIL || fromEmail,
            replyTo: `"${cleanName}" <${cleanEmail}>`,
            subject: `New Contact Form Message from ${cleanName}`,
            attachments: logoAttachment,
            html: `
    <div style="background:#090909;padding:36px 20px;font-family:Arial,sans-serif;color:#f8fafc;">
        <div style="max-width:720px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);">
            
            <div style="padding:22px 26px;background:linear-gradient(90deg,#3b0000 0%,#7f1d1d 45%,#b91c1c 100%);border-bottom:1px solid rgba(255,255,255,.08);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                        <td style="width:120px;vertical-align:middle;">
                            <img
                                src="cid:glitz-logo"
                                alt="Glitz Of Diamonds logo"
                                style="display:block;max-width:105px;height:auto;"
                            />
                        </td>
                        <td style="vertical-align:middle;padding-left:14px;">
                            <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;letter-spacing:.4px;">
                                Glitz Of Diamonds
                            </h1>
                            <p style="margin:6px 0 0 0;color:#ffe4e6;font-size:14px;line-height:1.4;">
                                Luxury that sparkles on every page
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div style="padding:28px 26px;">
                <h2 style="margin:0 0 20px 0;color:#ffffff;font-size:22px;font-weight:700;">
                    New Contact Request
                </h2>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:18px;">
                    <tr>
                        <td style="padding:10px 14px;background:#161616;border:1px solid rgba(255,255,255,.08);border-radius:12px;">
                            <p style="margin:0 0 8px 0;color:#f8fafc;"><strong>Name:</strong> ${safeName}</p>
                            <p style="margin:0;color:#f8fafc;"><strong>Email:</strong> ${safeEmail}</p>
                        </td>
                    </tr>
                </table>

                <div style="margin-top:18px;padding:20px;background:#0b0b0b;border:1px solid rgba(255,255,255,.08);border-radius:14px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:700;letter-spacing:.3px;color:#ffffff;text-transform:uppercase;">
                        Message
                    </p>
                    <p style="margin:0;line-height:1.8;color:#e5e7eb;font-size:15px;">
                        ${safeMessage}
                    </p>
                </div>
            </div>

            <div style="padding:16px 26px;background:#0d0d0d;border-top:1px solid rgba(255,255,255,.06);">
                <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                    This message was sent from the Glitz Of Diamonds website contact form.
                </p>
            </div>
        </div>
    </div>
`,
        });

        writeEmailLog({
            channel: "contact-admin-notification",
            status: "success",
            to: process.env.CONTACT_TO_EMAIL || fromEmail,
            subject: `New Contact Form Message from ${cleanName}`,
        });

        writeEmailLog({
            channel: "contact-user-confirmation",
            status: "attempt",
            to: cleanEmail,
            subject: "We received your message",
        });

        await transporter.sendMail({
            from: `"Glitz Of Diamonds" <${fromEmail}>`,
            to: cleanEmail,
            subject: "We received your message",
            attachments: logoAttachment,
            html: `
    <div style="background:#090909;padding:36px 20px;font-family:Arial,sans-serif;color:#f8fafc;">
        <div style="max-width:720px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);">
            
            <div style="padding:22px 26px;background:linear-gradient(90deg,#3b0000 0%,#7f1d1d 45%,#b91c1c 100%);border-bottom:1px solid rgba(255,255,255,.08);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                        <td style="width:120px;vertical-align:middle;">
                            <img
                                src="cid:glitz-logo"
                                alt="Glitz Of Diamonds logo"
                                style="display:block;max-width:105px;height:auto;"
                            />
                        </td>
                        <td style="vertical-align:middle;padding-left:14px;">
                            <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;letter-spacing:.4px;">
                                Glitz Of Diamonds
                            </h1>
                            <p style="margin:6px 0 0 0;color:#ffe4e6;font-size:14px;line-height:1.4;">
                                Thank you for contacting us
                            </p>
                        </td>
                    </tr>
                </table>
            </div>

            <div style="padding:28px 26px;">
                <p style="margin:0 0 14px 0;color:#ffffff;font-size:16px;">
                    Hi ${safeName},
                </p>

                <p style="margin:0 0 16px 0;line-height:1.8;color:#e5e7eb;font-size:15px;">
                    Thank you for reaching out to Glitz Of Diamonds. We received your message and will get back to you as soon as possible.
                </p>

                <p style="margin:0 0 18px 0;line-height:1.8;color:#d1d5db;font-size:15px;">
                    We appreciate your interest and look forward to connecting with you.
                </p>

                <div style="margin-top:18px;padding:20px;background:#0b0b0b;border:1px solid rgba(255,255,255,.08);border-radius:14px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:700;letter-spacing:.3px;color:#ffffff;text-transform:uppercase;">
                        Your message
                    </p>
                    <p style="margin:0;line-height:1.8;color:#e5e7eb;font-size:15px;">
                        ${safeMessage}
                    </p>
                </div>
            </div>

            <div style="padding:18px 26px;background:#0d0d0d;border-top:1px solid rgba(255,255,255,.06);">
                <p style="margin:0;color:#cbd5e1;font-size:14px;">
                    Glitz Of Diamonds
                </p>
                <p style="margin:6px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
                    This is an automated confirmation that we received your message.
                </p>
            </div>
        </div>
    </div>
`,
        });

        writeEmailLog({
            channel: "contact-user-confirmation",
            status: "success",
            to: cleanEmail,
            subject: "We received your message",
        });

        const forwardedFor = req.headers.get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim() || undefined;

        await insertContactMessage({
            name: cleanName,
            email: cleanEmail,
            message: cleanMessage,
            ipAddress: ip,
            isSpam: false,
        });

        return Response.json({ success: true });
    } catch (error) {
        writeEmailLog({
            channel: "contact-email-dispatch",
            status: "error",
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        console.error("Contact API error:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to send message.",
            },
            { status: 500 }
        );
    }
}
