import { NextResponse } from "next/server";
import { consumeLoginVerificationChallenge } from "@/lib/admin-db";
import { signAdminToken } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const { code } = await req.json();
        const cleanCode = String(code || "").trim();

        if (!/^\d{6}$/.test(cleanCode)) {
            return NextResponse.json(
                { success: false, error: "A valid 6-digit code is required." },
                { status: 400 }
            );
        }

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

        const challenge = await consumeLoginVerificationChallenge(challengeToken, cleanCode);

        if (!challenge) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired verification code." },
                { status: 401 }
            );
        }

        const token = signAdminToken({
            sub: String(challenge.user_id),
            username: challenge.username,
            role: challenge.role,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("glitz_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 8,
        });
        response.cookies.set("glitz_admin_2fa", "", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 0,
        });

        return response;
    } catch (error) {
        console.error("Verify code error:", error);
        return NextResponse.json(
            { success: false, error: "Verification failed." },
            { status: 500 }
        );
    }
}
