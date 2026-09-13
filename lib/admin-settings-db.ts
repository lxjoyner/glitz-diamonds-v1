import pool from "@/lib/db";

export type AdminSettings = {
    id: number;
    timezone: string;
    date_format: string;
    time_format: string;
    birthdays_on_calendar: number;
    birthday_excluded_user_ids: number[];
    updated_at: string;
};

type UpdateAdminSettingsInput = {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    birthdaysOnCalendar: boolean;
    birthdayExcludedUserIds: number[];
};

let initialized = false;

async function ensureSettingsTable() {
    if (initialized) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
            id TINYINT PRIMARY KEY DEFAULT 1,
            timezone VARCHAR(100) NOT NULL DEFAULT 'America/Chicago',
            date_format VARCHAR(40) NOT NULL DEFAULT 'MMM d, yyyy',
            time_format VARCHAR(20) NOT NULL DEFAULT 'h:mm a',
            birthdays_on_calendar TINYINT(1) NOT NULL DEFAULT 1,
            birthday_excluded_user_ids TEXT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (id = 1)
        )
    `);

    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS birthdays_on_calendar TINYINT(1) NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS birthday_excluded_user_ids TEXT NULL`);

    await pool.query(`
        INSERT INTO admin_settings (id, timezone, date_format, time_format)
        VALUES (1, 'America/Chicago', 'MMM d, yyyy', 'h:mm a')
        ON DUPLICATE KEY UPDATE id = id
    `);

    initialized = true;
}

export async function getAdminSettings(): Promise<AdminSettings> {
    await ensureSettingsTable();

    const [rows] = await pool.query(
        `
        SELECT id, timezone, date_format, time_format, birthdays_on_calendar, birthday_excluded_user_ids, updated_at
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
        `
    );

    const row = (rows as Array<Omit<AdminSettings, "birthday_excluded_user_ids"> & { birthday_excluded_user_ids: string | null }>)[0];
    let excludedIds: number[] = [];
    try {
        const parsed: unknown = JSON.parse(row.birthday_excluded_user_ids || "[]");
        if (Array.isArray(parsed)) excludedIds = normalizeExcludedUserIds(parsed);
    } catch {
        excludedIds = [];
    }

    return { ...row, birthday_excluded_user_ids: excludedIds };
}

export function normalizeExcludedUserIds(values: unknown[]): number[] {
    const ids = values.flatMap((value) => {
        if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return [value];
        if (typeof value === "string" && /^\d+$/.test(value.trim())) {
            const id = Number(value);
            return Number.isSafeInteger(id) && id > 0 ? [id] : [];
        }
        return [];
    });

    return [...new Set(ids)];
}

export async function updateAdminSettings(
    input: UpdateAdminSettingsInput
): Promise<AdminSettings> {
    await ensureSettingsTable();

    await pool.query(
        `
        UPDATE admin_settings
        SET timezone = ?, date_format = ?, time_format = ?, birthdays_on_calendar = ?, birthday_excluded_user_ids = ?
        WHERE id = 1
        `,
        [
            input.timezone,
            input.dateFormat,
            input.timeFormat,
            input.birthdaysOnCalendar ? 1 : 0,
            JSON.stringify(normalizeExcludedUserIds(input.birthdayExcludedUserIds)),
        ]
    );

    return getAdminSettings();
}
