import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteUserById, getAllUsers, setUserRole, UserRole } from "@/lib/user-db";

const VALID_ROLES = new Set<UserRole | "">(["member", "secretary", "treasurer", ""]);

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

    const users = await getAllUsers();
    return NextResponse.json({ success: true, users });
}

export async function PATCH(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { userId, role } = await req.json();

    const parsedId = Number(userId);
    const cleanRole = String(role ?? "").trim().toLowerCase();

    if (!Number.isInteger(parsedId) || parsedId <= 0 || !VALID_ROLES.has(cleanRole as UserRole | "")) {
        return NextResponse.json(
            { success: false, error: "Valid user id and role are required." },
            { status: 400 }
        );
    }

    await setUserRole(parsedId, cleanRole === "" ? null : (cleanRole as UserRole));

    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { userId } = await req.json();
    const parsedId = Number(userId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return NextResponse.json(
            { success: false, error: "Valid user id is required." },
            { status: 400 }
        );
    }

    const deletedCount = await deleteUserById(parsedId);
    if (deletedCount === 0) {
        return NextResponse.json(
            { success: false, error: "User was not found." },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true });
}
