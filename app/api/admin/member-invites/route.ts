import { NextRequest, NextResponse } from "next/server";
import { signMemberInviteToken, verifyAdminToken } from "@/lib/auth";
import { sendMemberInviteAdminCopyEmail, sendMemberInviteEmail } from "@/lib/mailer";
import { createMemberInviteRecord, listMemberInvites } from "@/lib/member-invite-db";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

function normalizePhoneNumber(value: string): string {
    return value.replace(/[^\d]/g, "").slice(-10);
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBaseUrl(request: NextRequest): string {
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_BASE_URL?.trim();

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, "");
    }

    const origin = request.headers.get("origin")?.trim();

    if (origin) {
        return origin.replace(/\/$/, "");
    }

    return request.nextUrl.origin.replace(/\/$/, "");
}

async function getInvitingAdminEmail(username: string) {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT email FROM users WHERE username = ? LIMIT 1
    `, [username]);
    return rows[0]?.email ? String(rows[0].email) : null;
}

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return { error: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }) };
    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== "admin") {
            return { error: NextResponse.json({ success: false, error: "Forbidden." }, { status: 403 }) };
        }
        return { payload };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireAdmin(req);
    if (auth.error) return auth.error;
    const invites = await listMemberInvites();
    return NextResponse.json({ success: true, invites });
}

export async function POST(req: NextRequest) {
    const auth = requireAdmin(req);
    if (auth.error) return auth.error;

    try {
        const adminPayload = auth.payload;
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

        const registerUrl = new URL("/register", getBaseUrl(req));
        registerUrl.searchParams.set("invite", inviteToken);
        const trackingUrl = new URL("/api/member-invite/open", getBaseUrl(req));
        trackingUrl.searchParams.set("token", inviteToken);

        const inviteMessage = "This is a one time use link to register with Glitz Of Diamonds, once the register button is clicked on the registration form that you will see once the link below is clicked, the link will become inactive. If you use the link do not click register if plan to come back and finish the process. Your First & Last Name, email and phone number will automatically be placed into the registration form.";

        const emailSendResult = await sendMemberInviteEmail({
            toEmail: email,
            firstName,
            invitedBy: adminPayload.username,
            inviteLink: registerUrl.toString(),
            trackingPixelUrl: trackingUrl.toString(),
        });

        await createMemberInviteRecord({
            inviteToken,
            invitedByUsername: adminPayload.username,
            invitedByAdminId: Number((adminPayload as { id?: number | string }).id || 0) || null,
            firstName,
            lastName,
            email,
            phoneNumber,
            inviteUrl: registerUrl.toString(),
            emailSent: emailSendResult.sent,
        });

        const invitingAdminEmail = await getInvitingAdminEmail(adminPayload.username);
        if (invitingAdminEmail) {
            await sendMemberInviteAdminCopyEmail({
                toEmail: invitingAdminEmail,
                invitedBy: adminPayload.username,
                inviteeName: `${firstName} ${lastName}`,
                inviteeEmail: email,
                inviteePhone: phoneNumber,
                inviteLink: registerUrl.toString(),
                inviteDelivered: emailSendResult.sent,
            });
        }

        return NextResponse.json({
            success: true,
            inviteLink: registerUrl.toString(),
            inviteEmailSent: emailSendResult.sent,
            inviteEmailReason: emailSendResult.sent ? null : emailSendResult.reason,
            emailLink: `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Glitz Of Diamonds Member Registration")}&body=${encodeURIComponent(`${inviteMessage}\n\n${registerUrl.toString()}`)}`,
            smsLink: `sms:+1${phoneNumber}?&body=${encodeURIComponent(
                `Hi ${firstName}, please complete your member registration: ${registerUrl.toString()}`
            )}`,
        });
    } catch (error) {
        console.error("Failed to create member invite link:", error);
        return NextResponse.json({ success: false, error: "Failed to create invite link." }, { status: 500 });
    }
}
