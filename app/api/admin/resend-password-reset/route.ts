import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
    createPasswordResetToken,
    getAdminByUsername,
    getAdminSecurityState,
    reserveAdminResetEmailResend,
} from "@/lib/admin-db";
import { sendAdminPasswordResetEmail } from "@/lib/mailer";

// The resend is only available after confirming the user's existing password.
// Never accept an email address supplied by the browser as the delivery target.
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const username = String(body?.username || "").trim().toLowerCase();
        const password = String(body?.password || "");
        if (!username || !password) {
            return NextResponse.json({ success: false, error: "Enter your username and password before requesting another reset link." }, { status: 400 });
        }

        const admin = await getAdminByUsername(username);
        if (!admin || !admin.is_active || !await bcrypt.compare(password, admin.password_hash)) {
            return NextResponse.json({ success: false, error: "Unable to verify this account. Check your username and password." }, { status: 401 });
        }

        const security = await getAdminSecurityState(admin.id);
        if (!admin.email || !security.reset_required && !security.last_reset_email_sent_at) {
            return NextResponse.json({ success: false, error: "No password-reset email is currently pending for this account." }, { status: 400 });
        }

        const allowed = await reserveAdminResetEmailResend(admin.id, 60);
        if (!allowed) {
            return NextResponse.json({ success: false, error: "A reset link was sent recently. Please wait at least 60 seconds before trying again." }, { status: 429 });
        }

        const token = await createPasswordResetToken(admin.id);
        const configured = process.env.APP_BASE_URL?.trim();
        const base = (configured || "https://www.glitzofdiamonds.com").replace(/\/$/, "");
        const resetUrl = `${base}/admin/reset-password?token=${encodeURIComponent(token)}`;
        const result = await sendAdminPasswordResetEmail({ toEmail: admin.email, username: admin.username, resetUrl });
        if (!result.sent) {
            return NextResponse.json({ success: false, error: "Unable to send a reset link right now. Please contact your administrator." }, { status: 503 });
        }

        return NextResponse.json({ success: true, message: "A new password-reset link has been sent to your registered email address. Please check your inbox and spam folder." });
    } catch (error) {
        console.error("Resend admin password-reset link failed:", error);
        return NextResponse.json({ success: false, error: "Unable to resend the reset link right now. Please try again later." }, { status: 500 });
    }
}
