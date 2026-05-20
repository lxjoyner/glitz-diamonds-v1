import { NextResponse } from "next/server";
import { createLoginVerificationChallenge, getActiveLoginVerificationChallenge } from "@/lib/admin-db";
import { sendAdminLoginVerificationCodeEmail } from "@/lib/mailer";

function generateSixDigitCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
    try {
        const cookieHeader = req.headers.get("cookie") || "";
        const challengeCookie = cookieHeader
            .split(";")
            .map((item) => item.trim())
            .find((item) => item.startsWith("glitz_admin_2fa="));
        const challengeToken = challengeCookie ? decodeURIComponent(challengeCookie.split("=")[1] || "") : "";

        if (!challengeToken) {
            return NextResponse.json(
                { success: false, error: "Verification session not found. Please sign in again." },
                { status: 401 }
            );
        }

        const activeChallenge = await getActiveLoginVerificationChallenge(challengeToken);

        if (!activeChallenge) {
            return NextResponse.json(
                { success: false, error: "Verification session expired. Please sign in again." },
                { status: 401 }
            );
        }

        const verificationCode = generateSixDigitCode();
        const newChallengeToken = await createLoginVerificationChallenge({
            userId: activeChallenge.user_id,
            userType: activeChallenge.user_type,
            username: activeChallenge.username,
            role: activeChallenge.role,
            email: activeChallenge.email,
            code: verificationCode,
            ttlMinutes: 10,
        });

        await sendAdminLoginVerificationCodeEmail({
            toEmail: activeChallenge.email,
            username: activeChallenge.username,
            verificationCode,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("glitz_admin_2fa", newChallengeToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        });

        return response;
    } catch (error) {
        console.error("Resend verification code error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to resend verification code." },
            { status: 500 }
        );
    }
}
