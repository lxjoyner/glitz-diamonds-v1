import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (
            username === process.env.ADMIN_USERNAME &&
            password === process.env.ADMIN_PASSWORD
        ) {
            const response = NextResponse.json({ success: true });

            response.cookies.set("glitz_admin_auth", process.env.ADMIN_SESSION_VALUE || "glitz-admin-auth", {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 60 * 8,
            });

            return response;
        }

        return NextResponse.json(
            { success: false, error: "Invalid username or password." },
            { status: 401 }
        );
    } catch (error) {
        console.error("Admin login error:", error);
        return NextResponse.json(
            { success: false, error: "Login failed." },
            { status: 500 }
        );
    }
}