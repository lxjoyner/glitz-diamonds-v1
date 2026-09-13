import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getUserByUsername, updateMemberProfile } from "@/lib/user-db";

function requireUser(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    try {
        return { payload: verifyAdminToken(token) };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireUser(req);
    if ("error" in auth) return auth.error;

    const user = await getUserByUsername(auth.payload.username);
    if (!user) return NextResponse.json({ success: false, error: "Member profile not found." }, { status: 404 });

    return NextResponse.json({
        success: true,
        profile: {
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
        },
    });
}

export async function PATCH(req: NextRequest) {
    const auth = requireUser(req);
    if ("error" in auth) return auth.error;

    const existing = await getUserByUsername(auth.payload.username);
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
        const updated = await updateMemberProfile(existing.id, {
            fullName,
            email,
            address,
            tshirtSize,
            favoriteColor,
            hatSize: jacketSize,
            gender,
            birthday,
        });
        return NextResponse.json({ success: true, profile: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.toLowerCase().includes("duplicate") || message.includes("ER_DUP_ENTRY")) {
            return NextResponse.json({ success: false, error: "That email address is already in use." }, { status: 409 });
        }
        console.error("Profile update error:", error);
        return NextResponse.json({ success: false, error: "Failed to update member profile." }, { status: 500 });
    }
}
