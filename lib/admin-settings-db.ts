import pool from "@/lib/db";

export type PasswordExpirationUnit = "days" | "months" | "years";

export type AdminSettings = {
    id: number;
    timezone: string;
    date_format: string;
    time_format: string;
    birthdays_on_calendar: number;
    birthday_excluded_user_ids: number[];
    password_expiration_value: number;
    password_expiration_unit: PasswordExpirationUnit;
    updated_at: string;
};

type UpdateAdminSettingsInput = {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    birthdaysOnCalendar: boolean;
    birthdayExcludedUserIds: number[];
    passwordExpirationValue: number;
    passwordExpirationUnit: PasswordExpirationUnit;
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
            password_expiration_value INT NOT NULL DEFAULT 60,
            password_expiration_unit VARCHAR(10) NOT NULL DEFAULT 'days',
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (id = 1)
        )
    `);

    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS birthdays_on_calendar TINYINT(1) NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS birthday_excluded_user_ids TEXT NULL`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS password_expiration_value INT NOT NULL DEFAULT 60`);
    await pool.query(`ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS password_expiration_unit VARCHAR(10) NOT NULL DEFAULT 'days'`);

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
        SELECT id, timezone, date_format, time_format, birthdays_on_calendar, birthday_excluded_user_ids,
               password_expiration_value, password_expiration_unit, updated_at
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
        `
    );

    const row = (rows as Array<Omit<AdminSettings, "birthday_excluded_user_ids" | "password_expiration_unit"> & {
        birthday_excluded_user_ids: string | null;
        password_expiration_unit: string | null;
    }>)[0];
    let excludedIds: number[] = [];
    try {
        const parsed: unknown = JSON.parse(row.birthday_excluded_user_ids || "[]");
        if (Array.isArray(parsed)) excludedIds = normalizeExcludedUserIds(parsed);
    } catch {
        excludedIds = [];
    }

    const unit: PasswordExpirationUnit = row.password_expiration_unit === "months" || row.password_expiration_unit === "years"
        ? row.password_expiration_unit
        : "days";
    const value = Number.isInteger(Number(row.password_expiration_value)) && Number(row.password_expiration_value) > 0
        ? Number(row.password_expiration_value)
        : 60;

    return {
        ...row,
        birthday_excluded_user_ids: excludedIds,
        password_expiration_value: value,
        password_expiration_unit: unit,
    };
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
        SET timezone = ?, date_format = ?, time_format = ?, birthdays_on_calendar = ?, birthday_excluded_user_ids = ?,
            password_expiration_value = ?, password_expiration_unit = ?
        WHERE id = 1
        `,
        [
            input.timezone,
            input.dateFormat,
            input.timeFormat,
            input.birthdaysOnCalendar ? 1 : 0,
            JSON.stringify(normalizeExcludedUserIds(input.birthdayExcludedUserIds)),
            input.passwordExpirationValue,
            input.passwordExpirationUnit,
        ]
    );

    return getAdminSettings();
}
