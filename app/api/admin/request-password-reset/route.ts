import { NextResponse } from "next/server";
import {
    createPasswordResetToken,
    getAdminByEmail,
    getAdminByUsername,
    markResetEmailSent,
    setAdminResetEmail,
} from "@/lib/admin-db";
import { sendAdminPasswordResetEmail } from "@/lib/mailer";

function getAppBaseUrl() {
    return process.env.APP_BASE_URL || "http://localhost:3000";
}

const genericResponse = {
    success: true,
    message: "If the admin account exists, a password reset email has been sent.",
};

export async function POST(req: Request) {
    try {
        const { username, email } = await req.json();
        const cleanUsername = String(username || "").trim();
        const cleanEmail = String(email || "").trim().toLowerCase();

        let admin = null;

        if (cleanUsername) {
            admin = await getAdminByUsername(cleanUsername);
            if (admin && cleanEmail) {
                await setAdminResetEmail(admin.id, cleanEmail);
                admin = { ...admin, email: cleanEmail };
            }
        } else if (cleanEmail) {
            admin = await getAdminByEmail(cleanEmail);
        }

        if (!admin || !admin.is_active || !admin.email) {
            return NextResponse.json(genericResponse);
        }

        const resetToken = await createPasswordResetToken(admin.id);
        const resetUrl = `${getAppBaseUrl()}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;

        await sendAdminPasswordResetEmail({
            toEmail: admin.email,
            username: admin.username,
            resetUrl,
        });

        await markResetEmailSent(admin.id);

        return NextResponse.json(genericResponse);
    } catch (error) {
        console.error("Request password reset error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to request password reset." },
            { status: 500 }
        );
    }
}
