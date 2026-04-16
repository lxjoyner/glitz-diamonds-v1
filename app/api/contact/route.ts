import nodemailer from "nodemailer";
import { writeContactLog } from "@/app/lib/contact-log";
import { insertContactMessage } from "@/lib/contact-db";

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

        const transporter = nodemailer.createTransport({
            host: "smtp.hostinger.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.verify();

        const safeName = escapeHtml(cleanName);
        const safeEmail = escapeHtml(cleanEmail);
        const safeMessage = escapeHtml(cleanMessage).replaceAll("\n", "<br />");

        await transporter.sendMail({
            from: `"Glitz Of Diamonds Contact Form" <${process.env.EMAIL_USER}>`,
            to: process.env.CONTACT_TO_EMAIL || process.env.EMAIL_USER,
            replyTo: `"${cleanName}" <${cleanEmail}>`,
            subject: `New Contact Form Message from ${cleanName}`,
            html: `
                <div style="background:#090909;padding:32px;font-family:Arial,sans-serif;color:#f8fafc;">
                    <div style="max-width:700px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;">
                        <div style="padding:24px;background:linear-gradient(90deg,#5b0000,#b91c1c,#7f1d1d);">
                            <h1 style="margin:0;font-size:28px;color:#ffffff;letter-spacing:.5px;">Glitz Of Diamonds</h1>
                            <p style="margin:8px 0 0 0;color:#ffe4e6;font-size:14px;">Luxury that sparkles on every page</p>
                        </div>

                        <div style="padding:24px;">
                            <h2 style="margin:0 0 18px 0;color:#ffffff;font-size:22px;">New Contact Request</h2>

                            <div style="margin-bottom:12px;">
                                <p style="margin:0 0 8px 0;"><strong>Name:</strong> ${safeName}</p>
                                <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${safeEmail}</p>
                            </div>

                            <div style="margin-top:18px;padding:18px;background:#0b0b0b;border:1px solid rgba(255,255,255,.08);border-radius:14px;">
                                <p style="margin:0 0 10px 0;font-weight:bold;color:#ffffff;">Message</p>
                                <p style="margin:0;line-height:1.7;color:#e5e7eb;">${safeMessage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `,
        });

        await transporter.sendMail({
            from: `"Glitz Of Diamonds" <${process.env.EMAIL_USER}>`,
            to: cleanEmail,
            subject: "We received your message",
            html: `
                <div style="background:#090909;padding:32px;font-family:Arial,sans-serif;color:#f8fafc;">
                    <div style="max-width:700px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden;">
                        <div style="padding:24px;background:linear-gradient(90deg,#5b0000,#b91c1c,#7f1d1d);">
                            <h1 style="margin:0;font-size:28px;color:#ffffff;letter-spacing:.5px;">Glitz Of Diamonds</h1>
                            <p style="margin:8px 0 0 0;color:#ffe4e6;font-size:14px;">Thank you for contacting us</p>
                        </div>

                        <div style="padding:24px;">
                            <p style="margin:0 0 14px 0;color:#ffffff;">Hi ${safeName},</p>

                            <p style="margin:0 0 14px 0;line-height:1.7;color:#e5e7eb;">
                                Thank you for reaching out to Glitz Of Diamonds. We received your message and will get back to you as soon as possible.
                            </p>

                            <div style="margin-top:18px;padding:18px;background:#0b0b0b;border:1px solid rgba(255,255,255,.08);border-radius:14px;">
                                <p style="margin:0 0 10px 0;font-weight:bold;color:#ffffff;">Your message</p>
                                <p style="margin:0;line-height:1.7;color:#e5e7eb;">${safeMessage}</p>
                            </div>

                            <p style="margin:20px 0 0 0;color:#cbd5e1;">
                                Glitz Of Diamonds
                            </p>
                        </div>
                    </div>
                </div>
            `,
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