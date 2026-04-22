import { NextRequest, NextResponse } from "next/server";
import { signMemberInviteToken, verifyAdminToken } from "@/lib/auth";

function normalizePhoneNumber(value: string): string {
    return value.replace(/[^\d]/g, "").slice(-10);
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const adminPayload = verifyAdminToken(token);

        if (adminPayload.role !== "admin") {
            return NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 });
        }

        const body = await req.json();
        const firstName = String(body?.firstName || "").trim();
        const lastName = String(body?.lastName || "").trim();
        const email = String(body?.email || "").trim().toLowerCase();
        const phoneNumber = normalizePhoneNumber(String(body?.phoneNumber || ""));

        if (!firstName || !lastName || !email || !phoneNumber) {
            return NextResponse.json(
                { success: false, error: "First name, last name, phone number, and email address are required." },
                { status: 400 }
            );
        }

        if (!isValidEmail(email)) {
            return NextResponse.json({ success: false, error: "Please provide a valid email address." }, { status: 400 });
        }

        if (phoneNumber.length !== 10) {
            return NextResponse.json({ success: false, error: "Phone number must contain 10 digits." }, { status: 400 });
        }

        const inviteToken = signMemberInviteToken({
            invitedBy: adminPayload.username,
            firstName,
            lastName,
            email,
            phoneNumber,
        });

        const registerUrl = new URL("/register", req.nextUrl.origin);
        registerUrl.searchParams.set("invite", inviteToken);

        return NextResponse.json({
            success: true,
            inviteLink: registerUrl.toString(),
            smsLink: `sms:+1${phoneNumber}?&body=${encodeURIComponent(
                `Hi ${firstName}, please complete your member registration: ${registerUrl.toString()}`
            )}`,
        });
    } catch (error) {
        console.error("Failed to create member invite link:", error);
        return NextResponse.json({ success: false, error: "Failed to create invite link." }, { status: 500 });
    }
}
