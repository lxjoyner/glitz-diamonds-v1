import pool from "@/lib/db";

export type AdminSettings = {
    id: number;
    timezone: string;
    date_format: string;
    time_format: string;
    birthdays_on_calendar: number;
    excluded_birthday_user_ids: number[];
    updated_at: string;
};

type UpdateAdminSettingsInput = {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    birthdaysOnCalendar?: boolean;
    excludedBirthdayUserIds?: number[];
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
            excluded_birthday_user_ids TEXT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (id = 1)
        )
    `);

    const [columns] = await pool.query(`SHOW COLUMNS FROM admin_settings`);
    const names = new Set((columns as Array<{ Field: string }>).map((column) => String(column.Field)));
    if (!names.has("birthdays_on_calendar")) {
        await pool.query(`ALTER TABLE admin_settings ADD COLUMN birthdays_on_calendar TINYINT(1) NOT NULL DEFAULT 1`);
    }
    if (!names.has("excluded_birthday_user_ids")) {
        await pool.query(`ALTER TABLE admin_settings ADD COLUMN excluded_birthday_user_ids TEXT NULL`);
    }

    await pool.query(`
        INSERT INTO admin_settings (id, timezone, date_format, time_format, birthdays_on_calendar)
        VALUES (1, 'America/Chicago', 'MMM d, yyyy', 'h:mm a', 1)
        ON DUPLICATE KEY UPDATE id = id
    `);

    initialized = true;
}

function parseExcludedBirthdayUserIds(value: unknown): number[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(String(value));
        if (!Array.isArray(parsed)) return [];
        return parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    } catch {
        return [];
    }
}

export async function getAdminSettings(): Promise<AdminSettings> {
    await ensureSettingsTable();

    const [rows] = await pool.query(
        `
        SELECT id, timezone, date_format, time_format, birthdays_on_calendar, excluded_birthday_user_ids, updated_at
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
        `
    );

    const row = (rows as Array<Omit<AdminSettings, "excluded_birthday_user_ids"> & { excluded_birthday_user_ids: string | null }>)[0];
    return {
        ...row,
        excluded_birthday_user_ids: parseExcludedBirthdayUserIds(row?.excluded_birthday_user_ids),
    };
}

export async function updateAdminSettings(
    input: UpdateAdminSettingsInput
): Promise<AdminSettings> {
    await ensureSettingsTable();

    const existing = await getAdminSettings();
    const birthdaysOnCalendar = input.birthdaysOnCalendar ?? Boolean(existing.birthdays_on_calendar);
    const excludedBirthdayUserIds = input.excludedBirthdayUserIds ?? existing.excluded_birthday_user_ids;

    await pool.query(
        `
        UPDATE admin_settings
        SET timezone = ?, date_format = ?, time_format = ?, birthdays_on_calendar = ?, excluded_birthday_user_ids = ?
        WHERE id = 1
        `,
        [
            input.timezone,
            input.dateFormat,
            input.timeFormat,
            birthdaysOnCalendar ? 1 : 0,
            JSON.stringify(excludedBirthdayUserIds),
        ]
    );

    return getAdminSettings();
}
