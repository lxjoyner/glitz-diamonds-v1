import { NextRequest, NextResponse } from "next/server";
import { markMemberInviteEmailOpened } from "@/lib/member-invite-db";

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zs54AAAAASUVORK5CYII=", "base64");

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (token) {
        try {
            await markMemberInviteEmailOpened(token);
        } catch (error) {
            console.error("Failed to record member invite email open:", error);
        }
    }

    return new NextResponse(PIXEL, {
        status: 200,
        headers: {
            "Content-Type": "image/png",
            "Content-Length": String(PIXEL.length),
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
        },
    });
}
