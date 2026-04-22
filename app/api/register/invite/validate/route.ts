import { NextRequest, NextResponse } from "next/server";
import { verifyMemberInviteToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const inviteToken = req.nextUrl.searchParams.get("invite");

    if (!inviteToken) {
        return NextResponse.json({ success: false, error: "Invite token is required." }, { status: 400 });
    }

    try {
        const invite = verifyMemberInviteToken(inviteToken);

        return NextResponse.json({
            success: true,
            invite: {
                firstName: invite.firstName,
                lastName: invite.lastName,
                email: invite.email,
                phoneNumber: invite.phoneNumber,
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: "Invalid or expired invite link." }, { status: 401 });
    }
}
