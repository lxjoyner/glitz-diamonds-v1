import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getUserById, updateMemberProfile } from "@/lib/user-db";

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== "admin") {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }
        return { payload };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

function serializeProfile(user: Awaited<ReturnType<typeof getUserById>>) {
    if (!user) return null;
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        address: user.address,
        tshirtSize: user.tshirt_size,
        favoriteColor: user.favorite_color,
        jacketSize: user.hat_size,
        gender: user.gender,
        birthday: user.birthday,
        role: user.role,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
    };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return NextResponse.json({ success: false, error: "Invalid member id." }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ success: false, error: "Member profile not found." }, { status: 404 });
    return NextResponse.json({ success: true, profile: serializeProfile(user) });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return NextResponse.json({ success: false, error: "Invalid member id." }, { status: 400 });
    }

    const existing = await getUserById(userId);
    if (!existing) return NextResponse.json({ success: false, error: "Member profile not found." }, { status: 404 });

    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const address = String(body.address || "").trim();
    const tshirtSize = String(body.tshirtSize || "").trim();
    const favoriteColor = String(body.favoriteColor || "").trim();
    const jacketSize = String(body.jacketSize || "").trim();
    const gender = String(body.gender || "").trim();
    const birthday = String(body.birthday || "").replace(/\D/g, "").slice(0, 4);

    if (!fullName || !email || !address || !tshirtSize || !favoriteColor || !jacketSize || !gender) {
        return NextResponse.json({ success: false, error: "Complete all required profile fields." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(birthday)) {
        return NextResponse.json({ success: false, error: "Birthday must be in MM/DD format." }, { status: 400 });
    }
    const month = Number(birthday.slice(0, 2));
    const day = Number(birthday.slice(2, 4));
    const probe = new Date(2000, month - 1, day);
    if (probe.getMonth() !== month - 1 || probe.getDate() !== day) {
        return NextResponse.json({ success: false, error: "Enter a valid birthday." }, { status: 400 });
    }

    try {
        await updateMemberProfile(userId, {
            fullName,
            email,
            address,
            tshirtSize,
            favoriteColor,
            hatSize: jacketSize,
            gender,
            birthday,
        });
        const updated = await getUserById(userId);
        return NextResponse.json({ success: true, profile: serializeProfile(updated) });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.toLowerCase().includes("duplicate") || message.includes("ER_DUP_ENTRY")) {
            return NextResponse.json({ success: false, error: "That email address is already in use." }, { status: 409 });
        }
        console.error("Admin profile update error:", error);
        return NextResponse.json({ success: false, error: "Failed to update member profile." }, { status: 500 });
    }
}
