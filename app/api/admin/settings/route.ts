import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminSettings, updateAdminSettings } from "@/lib/admin-settings-db";

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin") {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }

        return { ok: true as const };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const settings = await getAdminSettings();
    return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const timezone = String(body.timezone || "").trim();
    const dateFormat = String(body.dateFormat || "").trim();
    const timeFormat = String(body.timeFormat || "").trim();

    if (!timezone || !dateFormat || !timeFormat) {
        return NextResponse.json(
            { success: false, error: "timezone, dateFormat, and timeFormat are required." },
            { status: 400 }
        );
    }

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    } catch {
        return NextResponse.json({ success: false, error: "Invalid timezone." }, { status: 400 });
    }

    const settings = await updateAdminSettings({ timezone, dateFormat, timeFormat });
    return NextResponse.json({ success: true, settings });
}
