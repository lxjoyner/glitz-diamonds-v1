import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminByEmail } from "@/lib/admin-db";
import { sendUsernameReminderEmail } from "@/lib/mailer";
import { getUserByEmail } from "@/lib/user-db";

const genericResponse = {
    success: true,
    message: "If the account details are valid, your username has been sent to your email.",
};

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        const cleanEmail = String(email || "").trim().toLowerCase();
        const cleanPassword = String(password || "");

        if (!cleanEmail || !cleanPassword) {
            return NextResponse.json(
                { success: false, error: "Email and password are required." },
                { status: 400 }
            );
        }

        const admin = await getAdminByEmail(cleanEmail);

        if (admin && admin.is_active && admin.email) {
            const passwordMatches = await bcrypt.compare(cleanPassword, admin.password_hash);

            if (passwordMatches) {
                try {
                    await sendUsernameReminderEmail({
                        toEmail: admin.email,
                        username: admin.username,
                    });
                } catch (mailError) {
                    console.error("Forgot username admin email send failed:", mailError);
                }
            }

            return NextResponse.json(genericResponse);
        }

        const user = await getUserByEmail(cleanEmail);

        if (user && user.is_active && user.email) {
            const passwordMatches = await bcrypt.compare(cleanPassword, user.password_hash);

            if (passwordMatches) {
                try {
                    await sendUsernameReminderEmail({
                        toEmail: user.email,
                        username: user.username,
                    });
                } catch (mailError) {
                    console.error("Forgot username user email send failed:", mailError);
                }
            }
        }

        return NextResponse.json(genericResponse);
    } catch (error) {
        console.error("Forgot username error:", error);

        return NextResponse.json(genericResponse);
    }
}
