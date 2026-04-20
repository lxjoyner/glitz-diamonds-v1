import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return NextResponse.json({
            authenticated: false,
        });
    }

    try {
        const payload = verifyAdminToken(token);

        return NextResponse.json({
            authenticated: true,
            user: {
                id: payload.sub,
                username: payload.username,
                role: payload.role,
            },
        });
    } catch {
        return NextResponse.json({
            authenticated: false,
        });
    }
}