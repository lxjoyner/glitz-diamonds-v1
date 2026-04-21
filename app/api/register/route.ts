import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createRegisteredUser, getUserByEmail, getUserByUsername } from "@/lib/user-db";
import { getAdminNotificationEmails } from "@/lib/admin-db";
import { sendMemberRegistrationNotification } from "@/lib/mailer";

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
    try {
        const { fullName, username, email, password } = await req.json();

        const cleanFullName = String(fullName || "").trim();
        const cleanUsername = String(username || "").trim().toLowerCase();
        const cleanEmail = String(email || "").trim().toLowerCase();
        const cleanPassword = String(password || "");

        if (!cleanFullName || !cleanUsername || !cleanEmail || !cleanPassword) {
            return NextResponse.json(
                { success: false, error: "All registration fields are required." },
                { status: 400 }
            );
        }

        if (cleanPassword.length < 12) {
            return NextResponse.json(
                { success: false, error: "Password must be at least 12 characters." },
                { status: 400 }
            );
        }

        if (!isValidEmail(cleanEmail)) {
            return NextResponse.json(
                { success: false, error: "Please provide a valid email address." },
                { status: 400 }
            );
        }

        const existingUserByUsername = await getUserByUsername(cleanUsername);
        if (existingUserByUsername) {
            return NextResponse.json(
                { success: false, error: "Username is already in use." },
                { status: 409 }
            );
        }

        const existingUserByEmail = await getUserByEmail(cleanEmail);
        if (existingUserByEmail) {
            return NextResponse.json(
                { success: false, error: "Email is already in use." },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(cleanPassword, 12);

        await createRegisteredUser({
            fullName: cleanFullName,
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
        });

        const adminEmails = await getAdminNotificationEmails();
        await sendMemberRegistrationNotification({
            toEmails: adminEmails,
            fullName: cleanFullName,
            username: cleanUsername,
            email: cleanEmail,
        });

        return NextResponse.json({
            success: true,
            message: "Registration successful. Your account was created as a Member.",
        });
    } catch (error) {
        console.error("Registration error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to register at this time." },
            { status: 500 }
        );
    }
}
