import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin-settings-db";
import { visibleHelpTopics } from "@/lib/help-catalog";

// Do not expose role-restricted catalog entries or disabled Help content.
// The browser receives only the topics permitted for its signed-in role.
export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    let role: string;
    try {
        role = verifyAdminToken(token).role;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "treasurer", "secretary", "member"].includes(role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    try {
        const settings = await getAdminSettings();
        if (Number(settings.help_enabled) === 0) {
            return NextResponse.json({ success: false, error: "Help is disabled.", helpEnabled: false }, {
                status: 403, headers: { "Cache-Control": "no-store" },
            });
        }
        const topics = visibleHelpTopics(role).map(({ roles, ...topic }) => topic);
        return NextResponse.json({ success: true, helpEnabled: true, role, topics }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("Unable to load Help catalog:", error);
        return NextResponse.json({ success: false, error: "Help is temporarily unavailable." }, { status: 503 });
    }
}
