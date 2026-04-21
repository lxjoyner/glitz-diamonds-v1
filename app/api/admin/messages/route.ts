import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAllContactMessages } from "@/lib/contact-db";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin" && payload.role !== "secretary") {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const messages = await getAllContactMessages();

        return NextResponse.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error("Admin messages API error:", error);

        return NextResponse.json(
            { success: false, error: "Unauthorized", messages: [] },
            { status: 401 }
        );
    }
}