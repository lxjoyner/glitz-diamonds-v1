import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getUserByUsername } from "@/lib/user-db";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return NextResponse.json({
            authenticated: false,
        });
    }

    try {
        const payload = verifyAdminToken(token);
        let fullName: string | null = null;

        if (payload.role !== "admin") {
            const siteUser = await getUserByUsername(payload.username);
            fullName = siteUser?.full_name ?? null;
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: payload.sub,
                username: payload.username,
                role: payload.role,
                fullName,
            },
        });
    } catch {
        return NextResponse.json({
            authenticated: false,
        });
    }
}
