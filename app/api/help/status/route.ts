import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin-settings-db";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ authenticated: false, helpEnabled: false }, { status: 401 });
    try {
        verifyAdminToken(token);
    } catch {
        return NextResponse.json({ authenticated: false, helpEnabled: false }, { status: 401 });
    }
    try {
        const settings = await getAdminSettings();
        return NextResponse.json({ authenticated: true, helpEnabled: Number(settings.help_enabled) !== 0 }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("Unable to load Help availability:", error);
        return NextResponse.json({ authenticated: true, helpEnabled: false }, { status: 503 });
    }
}
