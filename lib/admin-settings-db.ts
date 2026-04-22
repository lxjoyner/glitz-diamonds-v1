import pool from "@/lib/db";

export type AdminSettings = {
    id: number;
    timezone: string;
    date_format: string;
    time_format: string;
    updated_at: string;
};

type UpdateAdminSettingsInput = {
    timezone: string;
    dateFormat: string;
    timeFormat: string;
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
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (id = 1)
        )
    `);

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
        SELECT id, timezone, date_format, time_format, updated_at
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
        `
    );

    return (rows as AdminSettings[])[0];
}

export async function updateAdminSettings(
    input: UpdateAdminSettingsInput
): Promise<AdminSettings> {
    await ensureSettingsTable();

    await pool.query(
        `
        UPDATE admin_settings
        SET timezone = ?, date_format = ?, time_format = ?
        WHERE id = 1
        `,
        [input.timezone, input.dateFormat, input.timeFormat]
    );

    return getAdminSettings();
}