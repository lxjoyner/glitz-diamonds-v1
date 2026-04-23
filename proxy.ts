import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const publicAdminRoutes = [
        "/admin/login",
        "/admin/reset-password",
        "/admin/forgot-username",
    ];

    const isPublicAdminRoute = publicAdminRoutes.includes(pathname);

    if (pathname.startsWith("/admin") && !isPublicAdminRoute) {
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