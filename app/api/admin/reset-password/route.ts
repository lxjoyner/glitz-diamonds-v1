import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { consumePasswordResetToken, updateAdminPassword } from "@/lib/admin-db";

function isStrongEnough(password: string) {
    return password.length >= 12;
}

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();
        const cleanToken = String(token || "").trim();
        const cleanPassword = String(password || "");

        if (!cleanToken || !cleanPassword) {
            return NextResponse.json(
                { success: false, error: "Token and password are required." },
                { status: 400 }
            );
        }

        if (!isStrongEnough(cleanPassword)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Password must be at least 12 characters.",
                },
                { status: 400 }
            );
        }

        const resetToken = await consumePasswordResetToken(cleanToken);

        if (!resetToken) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired reset token." },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash(cleanPassword, 12);
        await updateAdminPassword(resetToken.admin_id, passwordHash);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reset password error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to reset password." },
            { status: 500 }
        );
    }
}
