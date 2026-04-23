import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getRoleSettings, updateRoleSettings } from "@/lib/role-settings-db";

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

    const settings = await getRoleSettings();
    return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();

    if (!body || typeof body !== "object") {
        return NextResponse.json({ success: false, error: "Invalid role settings payload." }, { status: 400 });
    }

    const settings = await updateRoleSettings(body);
    return NextResponse.json({ success: true, settings });
}
