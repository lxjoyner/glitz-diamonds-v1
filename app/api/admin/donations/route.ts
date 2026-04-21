import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAllDonations } from "@/lib/donation-db";

function requireTreasurerOrAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin" && payload.role !== "treasurer") {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }

        return { ok: true as const };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireTreasurerOrAdmin(req);
    if ("error" in auth) return auth.error;

    const donations = await getAllDonations();
    return NextResponse.json({ success: true, donations });
}
