import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin/messages")) {
        const cookie = req.cookies.get("glitz_admin_auth")?.value;
        const expected = process.env.ADMIN_SESSION_VALUE || "glitz-admin-auth";

        if (cookie !== expected) {
            return NextResponse.redirect(new URL("/admin/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/messages/:path*"],
};