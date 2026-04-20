import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminByUsername, updateAdminPassword } from "@/lib/admin-db";

function isStrongEnough(password: string) {
    return password.length >= 12;
}

export async function POST(req: Request) {
    try {
        const { username, currentPassword, newPassword } = await req.json();

        const cleanUsername = String(username || "").trim();
        const cleanCurrentPassword = String(currentPassword || "");
        const cleanNewPassword = String(newPassword || "");

        if (!cleanUsername || !cleanCurrentPassword || !cleanNewPassword) {
            return NextResponse.json(
                { success: false, error: "Username, current password, and new password are required." },
                { status: 400 }
            );
        }

        if (!isStrongEnough(cleanNewPassword)) {
            return NextResponse.json(
                { success: false, error: "New password must be at least 12 characters." },
                { status: 400 }
            );
        }

        if (cleanCurrentPassword === cleanNewPassword) {
            return NextResponse.json(
                { success: false, error: "New password must be different from your current password." },
                { status: 400 }
            );
        }

        const admin = await getAdminByUsername(cleanUsername);

        if (!admin || !admin.is_active) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password." },
                { status: 401 }
            );
        }

        const currentPasswordMatches = await bcrypt.compare(
            cleanCurrentPassword,
            admin.password_hash
        );

        if (!currentPasswordMatches) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password." },
                { status: 401 }
            );
        }

        const newPasswordHash = await bcrypt.hash(cleanNewPassword, 12);
        await updateAdminPassword(admin.id, newPasswordHash);

        return NextResponse.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        console.error("Change password error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to change password." },
            { status: 500 }
        );
    }
}
