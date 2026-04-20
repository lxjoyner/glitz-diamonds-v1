import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
        const token = req.cookies.get("glitz_token")?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/admin/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};