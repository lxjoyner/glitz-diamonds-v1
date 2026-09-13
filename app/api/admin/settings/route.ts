import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminSettings, updateAdminSettings } from "@/lib/admin-settings-db";

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
    const current = await getAdminSettings();
    const timezone = String(body.timezone ?? current.timezone).trim();
    const dateFormat = String(body.dateFormat ?? current.date_format).trim();
    const timeFormat = String(body.timeFormat ?? current.time_format).trim();
    const birthdaysOnCalendar = body.birthdaysOnCalendar === undefined
        ? Boolean(current.birthdays_on_calendar)
        : Boolean(body.birthdaysOnCalendar);
    const excludedBirthdayUserIds = Array.isArray(body.excludedBirthdayUserIds)
        ? body.excludedBirthdayUserIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
        : current.excluded_birthday_user_ids;

    if (!timezone || !dateFormat || !timeFormat) {
        return NextResponse.json(
            { success: false, error: "timezone, dateFormat, and timeFormat are required." },
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
        excludedBirthdayUserIds,
    });
    return NextResponse.json({ success: true, settings });
}
