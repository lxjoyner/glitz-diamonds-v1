import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    getAdminSettings,
    normalizeExcludedUserIds,
    PasswordExpirationUnit,
    updateAdminSettings,
} from "@/lib/admin-settings-db";

function requireRole(req: NextRequest, allowedRoles: string[]) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }

    try {
        const payload = verifyAdminToken(token);

        if (!allowedRoles.includes(payload.role)) {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }

        return { ok: true as const };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireRole(req, ["admin", "secretary", "treasurer"]);
    if ("error" in auth) return auth.error;

    const settings = await getAdminSettings();
    return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
    const auth = requireRole(req, ["admin"]);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const timezone = String(body.timezone || "").trim();
    const dateFormat = String(body.dateFormat || "").trim();
    const timeFormat = String(body.timeFormat || "").trim();
    const birthdaysOnCalendar = body.birthdaysOnCalendar;
    const birthdayExcludedUserIds = body.birthdayExcludedUserIds;
    const passwordExpirationValue = Number(body.passwordExpirationValue);
    const passwordExpirationUnit = String(body.passwordExpirationUnit || "").trim() as PasswordExpirationUnit;

    if (!timezone || !dateFormat || !timeFormat) {
        return NextResponse.json(
            { success: false, error: "timezone, dateFormat, and timeFormat are required." },
            { status: 400 }
        );
    }

    if (typeof birthdaysOnCalendar !== "boolean" || !Array.isArray(birthdayExcludedUserIds)) {
        return NextResponse.json(
            { success: false, error: "Birthday calendar settings are invalid." },
            { status: 400 }
        );
    }

    if (!Number.isInteger(passwordExpirationValue) || passwordExpirationValue < 1 || passwordExpirationValue > 3650) {
        return NextResponse.json(
            { success: false, error: "Password expiration value must be a whole number between 1 and 3650." },
            { status: 400 }
        );
    }

    if (!["days", "months", "years"].includes(passwordExpirationUnit)) {
        return NextResponse.json(
            { success: false, error: "Password expiration unit must be days, months, or years." },
            { status: 400 }
        );
    }

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    } catch {
        return NextResponse.json({ success: false, error: "Invalid timezone." }, { status: 400 });
    }

    const settings = await updateAdminSettings({
        timezone,
        dateFormat,
        timeFormat,
        birthdaysOnCalendar,
        birthdayExcludedUserIds: normalizeExcludedUserIds(birthdayExcludedUserIds),
        passwordExpirationValue,
        passwordExpirationUnit,
    });
    return NextResponse.json({ success: true, settings });
}
