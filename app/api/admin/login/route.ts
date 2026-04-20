import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminByUsername } from "@/lib/admin-db";
import { signAdminToken } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        const cleanUsername = String(username || "").trim();
        const cleanPassword = String(password || "");

        if (!cleanUsername || !cleanPassword) {
            return NextResponse.json(
                { success: false, error: "Username and password are required." },
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

        const passwordMatches = await bcrypt.compare(
            cleanPassword,
            admin.password_hash
        );

        if (!passwordMatches) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password." },
                { status: 401 }
            );
        }

        const token = signAdminToken({
            sub: String(admin.id),
            username: admin.username,
            role: admin.role,
        });

        const response = NextResponse.json({ success: true });

        response.cookies.set("glitz_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 8,
        });

        return response;
    } catch (error) {
        console.error("Admin login error:", error);

        return NextResponse.json(
            { success: false, error: "Login failed." },
            { status: 500 }
        );
    }
}