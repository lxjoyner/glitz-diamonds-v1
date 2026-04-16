import { getAllContactMessages } from "@/lib/contact-db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const cookie = req.cookies.get("glitz_admin_auth")?.value;
    const expected = process.env.ADMIN_SESSION_VALUE || "glitz-admin-auth";

    if (cookie !== expected) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const messages = await getAllContactMessages();

        return NextResponse.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error("Admin messages API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to load messages.",
                messages: [],
            },
            { status: 500 }
        );
    }
}