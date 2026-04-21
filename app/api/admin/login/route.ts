import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
    createPasswordResetToken,
    getAdminByUsername,
    getAdminSecurityState,
    markResetEmailSent,
} from "@/lib/admin-db";
import { sendAdminPasswordResetEmail } from "@/lib/mailer";
import { signAdminToken } from "@/lib/auth";
import { getUserByUsername } from "@/lib/user-db";

function getPasswordResetIntervalDays() {
    return Number(process.env.PASSWORD_RESET_INTERVAL_DAYS || 60);
}

function getAppBaseUrl() {
    return process.env.APP_BASE_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        const cleanUsername = String(username || "").trim().toLowerCase();
        const cleanPassword = String(password || "");

        if (!cleanUsername || !cleanPassword) {
            return NextResponse.json(
                { success: false, error: "Username and password are required." },
                { status: 400 }
            );
        }

        const admin = await getAdminByUsername(cleanUsername);

        if (admin && admin.is_active) {
            const passwordMatches = await bcrypt.compare(cleanPassword, admin.password_hash);

            if (!passwordMatches) {
                return NextResponse.json(
                    { success: false, error: "Invalid username or password." },
                    { status: 401 }
                );
            }

            const securityState = await getAdminSecurityState(admin.id);
            const intervalMs = getPasswordResetIntervalDays() * 24 * 60 * 60 * 1000;
            const changedAtMs = new Date(securityState.password_changed_at).getTime();
            const passwordExpired = Date.now() - changedAtMs >= intervalMs;

            if (passwordExpired) {
                if (!admin.email) {
                    return NextResponse.json(
                        {
                            success: false,
                            error:
                                "Your password has expired. Configure an admin reset email first at /admin/reset-password.",
                        },
                        { status: 403 }
                    );
                }

                const resetToken = await createPasswordResetToken(admin.id);
                const resetUrl = `${getAppBaseUrl()}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;

                await sendAdminPasswordResetEmail({
                    toEmail: admin.email,
                    username: admin.username,
                    resetUrl,
                });

                await markResetEmailSent(admin.id);

                return NextResponse.json(
                    {
                        success: false,
                        error:
                            "Your password has expired. A reset link has been emailed to your admin account.",
                    },
                    { status: 403 }
                );
            }

            const token = signAdminToken({
                sub: String(admin.id),
                username: admin.username,
                role: "admin",
            });

            const response = NextResponse.json({ success: true });
            response.cookies.set("glitz_token", token, {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 60 * 8,
            });
            return response;
        }

        const user = await getUserByUsername(cleanUsername);

        if (!user || !user.is_active || !user.role) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password." },
                { status: 401 }
            );
        }

        const userPasswordMatches = await bcrypt.compare(cleanPassword, user.password_hash);
        if (!userPasswordMatches) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password." },
                { status: 401 }
            );
        }

        const token = signAdminToken({
            sub: String(user.id),
            username: user.username,
            role: user.role,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("glitz_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 8,
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);

        return NextResponse.json(
            { success: false, error: "Login failed." },
            { status: 500 }
        );
    }
}
