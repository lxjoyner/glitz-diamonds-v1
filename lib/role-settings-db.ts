import pool from "@/lib/db";
import { DEFAULT_ROLE_SETTINGS, ROLE_PERMISSION_OPTIONS, RolePermissionSection, RoleSettings } from "@/lib/role-settings";

let initialized = false;

async function ensureRoleSettingsTable() {
    if (initialized) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS role_settings (
            id TINYINT PRIMARY KEY DEFAULT 1,
            settings_json JSON NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CHECK (id = 1)
        )
    `);

    await pool.query(
        `
        INSERT INTO role_settings (id, settings_json)
        VALUES (1, ?)
        ON DUPLICATE KEY UPDATE id = id
        `,
        [JSON.stringify(DEFAULT_ROLE_SETTINGS)]
    );

    initialized = true;
}

function normalizeRoleSettings(raw: unknown): RoleSettings {
    const source = (raw && typeof raw === "object" ? raw : {}) as Partial<RoleSettings>;

    const normalizeRole = (
        role: Partial<Record<RolePermissionSection, Record<string, boolean>>> | undefined
    ) => {
        return {
            dashboardItems: Object.fromEntries(
                ROLE_PERMISSION_OPTIONS.dashboardItems.map((item) => [item, Boolean(role?.dashboardItems?.[item])])
            ),
            hamburgerMenuItems: Object.fromEntries(
                ROLE_PERMISSION_OPTIONS.hamburgerMenuItems.map((item) => [item, Boolean(role?.hamburgerMenuItems?.[item])])
            ),
            ideasActivitiesItems: Object.fromEntries(
                ROLE_PERMISSION_OPTIONS.ideasActivitiesItems.map((item) => [item, Boolean(role?.ideasActivitiesItems?.[item])])
            ),
        };
    };

    return {
        admin: {
            accessViewAll: source.admin?.accessViewAll !== false,
        },
        secretary: normalizeRole(source.secretary),
        treasure: normalizeRole(source.treasure),
        member: normalizeRole(source.member),
    };
}

export async function getRoleSettings(): Promise<RoleSettings> {
    await ensureRoleSettingsTable();

    const [rows] = await pool.query(
        `
        SELECT settings_json
        FROM role_settings
        WHERE id = 1
        LIMIT 1
        `
    );

    const row = (rows as Array<{ settings_json: unknown }>)[0];
    const jsonValue = typeof row?.settings_json === "string" ? JSON.parse(row.settings_json) : row?.settings_json;

    return normalizeRoleSettings(jsonValue);
}

export async function updateRoleSettings(settings: RoleSettings): Promise<RoleSettings> {
    await ensureRoleSettingsTable();

    const normalized = normalizeRoleSettings(settings);

    await pool.query(
        `
        UPDATE role_settings
        SET settings_json = ?
        WHERE id = 1
        `,
        [JSON.stringify(normalized)]
    );

    return getRoleSettings();
}
