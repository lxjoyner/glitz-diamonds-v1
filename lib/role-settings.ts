export type RoleKey = "admin" | "secretary" | "treasure" | "member";
export type RolePermissionSection = "dashboardItems" | "hamburgerMenuItems" | "ideasActivitiesItems";

export type RoleSettings = {
    admin: {
        accessViewAll: boolean;
    };
    secretary: Record<RolePermissionSection, Record<string, boolean>>;
    treasure: Record<RolePermissionSection, Record<string, boolean>>;
    member: Record<RolePermissionSection, Record<string, boolean>>;
};

export const ROLE_PERMISSION_OPTIONS: Record<RolePermissionSection, string[]> = {
    dashboardItems: [
        "Dashboard Date/Time Settings",
        "Member Role Manager",
        "Gallery Manager",
        "Contact Messages",
    ],
    hamburgerMenuItems: [
        "Registered Users Details",
        "Member Invites",
        "Dashboard",
        "Ideas & Activities",
        "Calendar",
    ],
    ideasActivitiesItems: [
        "Community Ideas & Voting",
        "Add To Calendar",
        "Remove Idea",
        "Remove From Calendar",
    ],
};

function makeRoleDefaults() {
    return {
        dashboardItems: Object.fromEntries(ROLE_PERMISSION_OPTIONS.dashboardItems.map((item) => [item, false])),
        hamburgerMenuItems: Object.fromEntries(ROLE_PERMISSION_OPTIONS.hamburgerMenuItems.map((item) => [item, false])),
        ideasActivitiesItems: Object.fromEntries(ROLE_PERMISSION_OPTIONS.ideasActivitiesItems.map((item) => [item, false])),
    };
}

export const DEFAULT_ROLE_SETTINGS: RoleSettings = {
    admin: {
        accessViewAll: true,
    },
    secretary: makeRoleDefaults(),
    treasure: makeRoleDefaults(),
    member: makeRoleDefaults(),
};
