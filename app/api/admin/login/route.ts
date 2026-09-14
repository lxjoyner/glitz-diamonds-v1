import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
    createLoginVerificationChallenge,
    createPasswordResetToken,
    getAdminByUsername,
    getAdminSecurityState,
    markResetEmailSent,
} from "@/lib/admin-db";
import { getAdminSettings } from "@/lib/admin-settings-db";
import { sendAdminLoginVerificationCodeEmail, sendAdminPasswordResetEmail } from "@/lib/mailer";
import { getUserByUsername } from "@/lib/user-db";

function addExpirationInterval(changedAt: Date, value: number, unit: "days" | "months" | "years") {
    const expiresAt = new Date(changedAt);
    if (unit === "months") {
        expiresAt.setMonth(expiresAt.getMonth() + value);
    } else if (unit === "years") {
        expiresAt.setFullYear(expiresAt.getFullYear() + value);
    } else {
        expiresAt.setDate(expiresAt.getDate() + value);
    }
    return expiresAt;
}

function isExpired(changedAtValue: string, value: number, unit: "days" | "months" | "years") {
    const changedAt = new Date(changedAtValue);
    if (Number.isNaN(changedAt.getTime())) return false;
    return Date.now() >= addExpirationInterval(changedAt, value, unit).getTime();
}

function getAppBaseUrl(req: Request) {
    const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
    if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, "");

    if (process.env.NODE_ENV === "production") {
        const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
        const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
        const host = forwardedHost || req.headers.get("host")?.trim();
        if (host) {
            const protocol = forwardedProto || "https";
            return `${protocol}://${host}`.replace(/\/$/, "");
        }
        return "https://www.glitzofdiamonds.com";
    }

    return "http://localhost:3000";
}

function generateSixDigitCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();
        const cleanUsername = String(username || "").trim().toLowerCase();
        const cleanPassword = String(password || "");

        if (!cleanUsername || !cleanPassword) {
            return NextResponse.json({ success: false, error: "Username and password are required." }, { status: 400 });
        }

        const admin = await getAdminByUsername(cleanUsername);

        if (admin && admin.is_active) {
            const passwordMatches = await bcrypt.compare(cleanPassword, admin.password_hash);
            if (!passwordMatches) {
                return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
            }

            const [securityState, adminSettings] = await Promise.all([
                getAdminSecurityState(admin.id),
                getAdminSettings(),
            ]);

            if (securityState.reset_required) {
                return NextResponse.json({
                    success: false,
                    error: "A temporary password was issued for this account. Please use Change Password now to set a new password.",
                }, { status: 403 });
            }

            if (isExpired(
                securityState.password_changed_at,
                adminSettings.password_expiration_value,
                adminSettings.password_expiration_unit
            )) {
                if (!admin.email) {
                    return NextResponse.json({
                        success: false,
                        error: "Your password has expired. Configure an admin reset email first at /admin/reset-password.",
                    }, { status: 403 });
                }

                const resetToken = await createPasswordResetToken(admin.id);
                const resetUrl = `${getAppBaseUrl(req)}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;
                await sendAdminPasswordResetEmail({ toEmail: admin.email, username: admin.username, resetUrl });
                await markResetEmailSent(admin.id);

                return NextResponse.json({
                    success: false,
                    error: "Your password has expired. A reset link has been emailed to your admin account.",
                }, { status: 403 });
            }

            if (!admin.email) {
                return NextResponse.json({ success: false, error: "Your account has no registered email address for two-factor verification." }, { status: 403 });
            }

            const verificationCode = generateSixDigitCode();
            const challengeToken = await createLoginVerificationChallenge({
                userId: admin.id,
                userType: "admin",
                username: admin.username,
                role: "admin",
                email: admin.email,
                code: verificationCode,
                ttlMinutes: 10,
            });

            await sendAdminLoginVerificationCodeEmail({
                toEmail: admin.email,
                username: admin.username,
                verificationCode,
            });

            const response = NextResponse.json({ success: true, requiresTwoFactor: true });
            response.cookies.set("glitz_admin_2fa", challengeToken, {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 10,
            });
            return response;
        }

        const user = await getUserByUsername(cleanUsername);
        if (!user || !user.is_active || !user.role) {
            return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
        }

        const userPasswordMatches = await bcrypt.compare(cleanPassword, user.password_hash);
        if (!userPasswordMatches) {
            return NextResponse.json({ success: false, error: "Invalid username or password." }, { status: 401 });
        }

        const adminSettings = await getAdminSettings();
        if (isExpired(
            user.password_changed_at,
            adminSettings.password_expiration_value,
            adminSettings.password_expiration_unit
        )) {
            return NextResponse.json({
                success: false,
                error: `Your password has expired. Please use Change Password to set a new password before signing in.`,
            }, { status: 403 });
        }

        if (!user.email) {
            return NextResponse.json({ success: false, error: "Your account has no registered email address for two-factor verification." }, { status: 403 });
        }

        const verificationCode = generateSixDigitCode();
        const challengeToken = await createLoginVerificationChallenge({
            userId: user.id,
            userType: "user",
            username: user.username,
            role: user.role,
            email: user.email,
            code: verificationCode,
            ttlMinutes: 10,
        });

        await sendAdminLoginVerificationCodeEmail({
            toEmail: user.email,
            username: user.username,
            verificationCode,
        });

        const response = NextResponse.json({ success: true, requiresTwoFactor: true });
        response.cookies.set("glitz_admin_2fa", challengeToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 10,
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ success: false, error: "Login failed." }, { status: 500 });
    }
}
