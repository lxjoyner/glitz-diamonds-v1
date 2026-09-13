import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminByUsername, getAdminPasswordHistory, updateAdminPassword } from "@/lib/admin-db";
import { getUserByUsername, getUserPasswordHistory, updateUserPassword } from "@/lib/user-db";

function isStrongEnough(password: string) {
    return password.length >= 12;
}

async function passwordWasUsed(password: string, hashes: string[]) {
    for (const hash of hashes) {
        if (await bcrypt.compare(password, hash)) return true;
    }
    return false;
}

export async function POST(req: Request) {
    try {
        const { username, currentPassword, newPassword } = await req.json();

        const cleanUsername = String(username || "").trim().toLowerCase();
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

        const admin = await getAdminByUsername(cleanUsername);

        if (admin && admin.is_active) {
            const currentPasswordMatches = await bcrypt.compare(cleanCurrentPassword, admin.password_hash);
            if (!currentPasswordMatches) {
                return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
            }

            const history = [admin.password_hash, ...(await getAdminPasswordHistory(admin.id, 10))];
            if (await passwordWasUsed(cleanNewPassword, history)) {
                return NextResponse.json(
                    { success: false, error: "You cannot reuse your current password or any of your last 10 passwords." },
                    { status: 400 }
                );
            }

            const newPasswordHash = await bcrypt.hash(cleanNewPassword, 12);
            await updateAdminPassword(admin.id, newPasswordHash);
            return NextResponse.json({ success: true, message: "Password changed successfully." });
        }

        const user = await getUserByUsername(cleanUsername);

        if (!user || !user.is_active) {
            return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
        }

        const currentPasswordMatches = await bcrypt.compare(cleanCurrentPassword, user.password_hash);
        if (!currentPasswordMatches) {
            return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
        }

        const history = [user.password_hash, ...(await getUserPasswordHistory(user.id, 10))];
        if (await passwordWasUsed(cleanNewPassword, history)) {
            return NextResponse.json(
                { success: false, error: "You cannot reuse your current password or any of your last 10 passwords." },
                { status: 400 }
            );
        }

        const newPasswordHash = await bcrypt.hash(cleanNewPassword, 12);
        await updateUserPassword(user.id, newPasswordHash);

        return NextResponse.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ success: false, error: "Failed to change password." }, { status: 500 });
    }
}
