import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
    getAdminByEmail,
    getAdminByUsername,
    setAdminResetEmail,
    setAdminTemporaryPassword,
} from "@/lib/admin-db";
import { sendAdminTemporaryPasswordEmail } from "@/lib/mailer";

const genericResponse = {
    success: true,
    message: "If the account exists, temporary password instructions have been sent.",
};

function generateTemporaryPassword(length = 16) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    const bytes = crypto.randomBytes(length);

    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

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

        const temporaryPassword = generateTemporaryPassword();
        const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 12);

        await setAdminTemporaryPassword(admin.id, temporaryPasswordHash);

        await sendAdminTemporaryPasswordEmail({
            toEmail: admin.email,
            username: admin.username,
            temporaryPassword,
        });

        return NextResponse.json(genericResponse);
    } catch (error) {
        console.error("Request password reset error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to request password reset." },
            { status: 500 }
        );
    }
}
