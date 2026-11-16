export type HelpRole = "admin" | "treasurer" | "secretary" | "member";

export type HelpTopic = {
    id: string;
    title: string;
    category: string;
    summary: string;
    path: string;
    roles: readonly HelpRole[];
    videoStatus: "coming_soon";
};

// Phase 2 is a curated navigation/tutorial catalog. Video files and playback
// are intentionally deferred to the authenticated upload workflow in Phase 3.
// Roles reflect the routes currently exposed in Header.tsx and Dashboard.
const EVERYONE: readonly HelpRole[] = ["admin", "treasurer", "secretary", "member"];
const FINANCE: readonly HelpRole[] = ["admin", "treasurer"];
const ADMIN: readonly HelpRole[] = ["admin"];
const ADMIN_SECRETARY: readonly HelpRole[] = ["admin", "secretary"];

export const HELP_TOPICS: readonly HelpTopic[] = [
    { id: "profile", title: "Update My Profile", category: "My Account", summary: "Find your personal details and update your profile.", path: "/profile", roles: EVERYONE, videoStatus: "coming_soon" },
    { id: "dashboard", title: "Explore the Dashboard", category: "Getting Started", summary: "Open your role dashboard and find the tools available to you.", path: "/admin/messages", roles: EVERYONE, videoStatus: "coming_soon" },
    { id: "calendar", title: "Use the Calendar", category: "Community", summary: "Find dates and community activities on the calendar.", path: "/calendar", roles: EVERYONE, videoStatus: "coming_soon" },
    { id: "ideas", title: "View Ideas and Activities", category: "Community", summary: "Browse community ideas and activities.", path: "/admin/ideas-activities", roles: EVERYONE, videoStatus: "coming_soon" },
    { id: "messages", title: "Review Contact Messages", category: "Dashboard", summary: "Locate contact messages on the dashboard.", path: "/admin/messages", roles: ADMIN_SECRETARY, videoStatus: "coming_soon" },
    { id: "gallery", title: "Manage the Gallery", category: "Dashboard", summary: "Find the gallery management section on the dashboard.", path: "/admin/messages", roles: ADMIN_SECRETARY, videoStatus: "coming_soon" },
    { id: "invoices", title: "View the Invoice Dashboard", category: "Invoicing", summary: "Find invoices and invoice actions.", path: "/admin/invoices", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "new-invoice", title: "Create a New Invoice", category: "Invoicing", summary: "Open the new invoice form.", path: "/admin/invoices/new", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "recurring", title: "Manage Recurring Invoices", category: "Invoicing", summary: "Find recurring schedules and the automatic invoice scheduler.", path: "/admin/invoices/recurring", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "vendors", title: "Manage Vendors", category: "Vendors & Bills", summary: "Open the vendor directory and its available actions.", path: "/admin/vendors", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "vendor-bills", title: "Review Vendor Bills", category: "Vendors & Bills", summary: "Locate vendor bills and payment details.", path: "/admin/vendors/bills", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "transactions", title: "Review Transactions", category: "Vendors & Bills", summary: "Open the transactions area.", path: "/admin/transactions", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "reports", title: "View Financial Reports", category: "Reports", summary: "Explore income, account transactions and balance sheet reports.", path: "/admin/reports/income-by-customer", roles: FINANCE, videoStatus: "coming_soon" },
    { id: "users", title: "Manage Registered Users", category: "Administration", summary: "Find user records and membership details.", path: "/admin/membership", roles: ADMIN, videoStatus: "coming_soon" },
    { id: "invites", title: "Send Member Invitations", category: "Administration", summary: "Open the member invitation manager.", path: "/admin/member-invites", roles: ADMIN, videoStatus: "coming_soon" },
    { id: "roles", title: "Manage User Roles", category: "Administration", summary: "Open the Roles Manager and review available permissions.", path: "/admin/roles-manager", roles: ADMIN, videoStatus: "coming_soon" },
    { id: "help-toggle", title: "Enable or Disable Help", category: "Administration", summary: "Change the Help System setting in Dashboard and save it.", path: "/admin/messages", roles: ADMIN, videoStatus: "coming_soon" },
    { id: "invoice-settings", title: "Configure Invoice Settings", category: "Administration", summary: "Open settings for invoicing.", path: "/admin/invoices/settings", roles: ADMIN, videoStatus: "coming_soon" },
];

export function visibleHelpTopics(role: string): HelpTopic[] {
    if (!["admin", "treasurer", "secretary", "member"].includes(role)) return [];
    return HELP_TOPICS.filter((topic) => topic.roles.includes(role as HelpRole));
}
