export type TourRole = "admin" | "treasurer" | "secretary" | "member";

export type GuidedTourStep = {
    selector: string;
    title: string;
    description: string;
    /** Route pattern: dynamic invoice ID is accepted only on the recording page. */
    path: "/admin/invoices" | "/admin/invoices/new" | "/admin/invoices/recurring" | "/admin/invoices/recurring/new" | "/admin/invoices/[id]/record-payment" | "/admin/invoices/[id]/reverse-payment" | "/admin/vendors/bills" | "/admin/reports/income-by-customer" | "/admin/reports/account-transactions" | "/admin/reports/balance-sheet" | "/admin/vendors" | "/admin/vendors/new" | "/admin/vendors/[id]/edit" | "/admin/vendors/[id]/create-bill" | "/admin/transactions" | "/admin/transactions/[key]/edit" | "/admin/membership" | "/admin/membership/[id]/edit" | "/admin/member-invites" | "/admin/roles-manager";
    /** A real click is required to proceed; no financial action is performed by the tour. */
    advanceOnClick?: boolean;
};

export type GuidedTour = {
    id: string;
    title: string;
    path: string;
    helpTopicId: string;
    roles: readonly TourRole[];
    steps: readonly GuidedTourStep[];
};

export function stepMatchesPath(path: GuidedTourStep["path"], pathname: string): boolean {
    if (path === "/admin/membership/[id]/edit") return /^\/admin\/membership\/\d+\/edit$/.test(pathname);
    if (path === "/admin/membership" || path === "/admin/member-invites" || path === "/admin/roles-manager") return pathname === path;
    if (path === "/admin/transactions/[key]/edit") return /^\/admin\/transactions\/[^/]+\/edit$/.test(pathname);
    if (path === "/admin/transactions") return pathname === path;
    if (path === "/admin/vendors/[id]/edit") return /^\/admin\/vendors\/\d+\/edit$/.test(pathname);
    if (path === "/admin/vendors/[id]/create-bill") return /^\/admin\/vendors\/\d+\/create-bill$/.test(pathname);
    if (path === "/admin/vendors" || path === "/admin/vendors/new") return pathname === path;
    if (path === "/admin/vendors/bills" || path === "/admin/reports/income-by-customer" || path === "/admin/reports/account-transactions" || path === "/admin/reports/balance-sheet") return pathname === path;
    if (path === "/admin/invoices" || path === "/admin/invoices/new" || path === "/admin/invoices/recurring" || path === "/admin/invoices/recurring/new") return pathname === path;
    if (path === "/admin/invoices/[id]/record-payment") return /^\/admin\/invoices\/\d+\/record-payment$/.test(pathname);
    return /^\/admin\/invoices\/\d+\/reverse-payment$/.test(pathname);
}

const CREATE_INVOICE_FORM_STEPS: readonly GuidedTourStep[] = [
            {
                selector: '[data-tour="new-invoice-member"]',
                title: "Select the member to bill",
                description: "Choose the member from Bill to. Only members with an email address appear in this list.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-reference"]',
                title: "Optional P.O. or reference number",
                description: "Enter a purchase order or reference if needed. The invoice number itself is generated automatically.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-date"]',
                title: "Check the invoice date",
                description: "Select the issue date for this invoice.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-due"]',
                title: "Set the payment due date",
                description: "Choose the date by which the member should pay.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-description"]',
                title: "Describe the charge",
                description: "Enter the first line item description. You can add more items below if necessary.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-quantity"]',
                title: "Enter quantity",
                description: "Set the quantity for this line item. It must be greater than zero.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-price"]',
                title: "Enter unit price",
                description: "Enter the unit price. The line amount and invoice subtotal are calculated for you.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-add-item"]',
                title: "Add more line items if needed",
                description: "Use Add an item for additional charges. Leave this button untouched if one item is sufficient.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-notes"]',
                title: "Add member-visible notes",
                description: "Optional notes may explain the charge to the member.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-terms"]',
                title: "Review payment terms",
                description: "Review or edit the payment terms before saving.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-totals"]',
                title: "Review discounts, tax, and total",
                description: "Verify the calculated subtotal, discount, tax, total, and amount due. Change any inputs as needed.",
                path: "/admin/invoices/new",
            },
            {
                selector: '[data-tour="new-invoice-save-actions"]',
                title: "Save draft or approve",
                description: "Save and continue creates a draft; Approve Draft saves and approves it. Finish this guide before clicking either option. These are real actions that can create an invoice, and the guide never clicks them for you.",
                path: "/admin/invoices/new",
            },
];


const REVERSE_PAYMENT_FORM_STEPS: readonly GuidedTourStep[] = [
    {
        selector: '[data-tour="reverse-invoice-summary"]',
        title: "Review the invoice and outstanding balance",
        description: "Confirm the invoice number, member, total, paid amount, and outstanding balance. Reversing a payment changes balances and financial reports.",
        path: "/admin/invoices/[id]/reverse-payment",
    },
    {
        selector: '[data-tour="reverse-payment-list"]',
        title: "Identify the incorrect payment",
        description: "Review payment amounts, dates, methods, and receiving accounts. Only individually recorded payments can be reversed; imported historical paid amounts cannot.",
        path: "/admin/invoices/[id]/reverse-payment",
    },
    {
        selector: '[data-tour="reverse-payment-reason"]',
        title: "Provide a reason",
        description: "Select the incorrect payment and enter a clear reason of at least ten characters. The reason becomes part of the reversal audit history.",
        path: "/admin/invoices/[id]/reverse-payment",
    },
    {
        selector: '[data-tour="reverse-payment-warning"]',
        title: "Understand the impact",
        description: "A reversal updates accounting balances and reports, but does not refund money or retract receipts already sent. Check the receiving account separately.",
        path: "/admin/invoices/[id]/reverse-payment",
    },
    {
        selector: '[data-tour="reverse-payment-confirm"]',
        title: "Review before reversing",
        description: "Finish this walkthrough first. Then, only if you intend to reverse a REAL payment, personally click Confirm payment reversal and review the separate confirmation dialog. The guide never executes a reversal.",
        path: "/admin/invoices/[id]/reverse-payment",
    },
];

const RECURRING_CREATE_STEPS: readonly GuidedTourStep[] = [
    {
        selector: '[data-tour="recurring-customer"]',
        title: "Choose the customer",
        description: "Click Add a customer and select a member with an email address. The guide only explains this selection; it does not select anyone.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-reference"]',
        title: "Optional reference",
        description: "Enter an optional P.O./S.O. number. Invoice numbers are generated by the application.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-payment-due"]',
        title: "Choose payment terms",
        description: "Select On Receipt, within 7, 15, or 30 days for each generated invoice.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-status"]',
        title: "Choose Active or Draft",
        description: "Active schedules are eligible for automatic invoice creation when due; Draft schedules are not processed.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-repeat-day"]',
        title: "Set the monthly repeat day",
        description: "Enter a day from 1 to 28 for monthly recurrence. Check this day matches your billing plan.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-first-date"]',
        title: "Set the first invoice date",
        description: "Select when the recurring billing schedule begins. Review this date carefully because active schedules can be picked up by the scheduler when due.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-line-description"]',
        title: "Describe the recurring charge",
        description: "Enter an item description. Additional line items can be added, but this schedule currently stores their combined total as its recurring amount.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-line-quantity"]',
        title: "Set the quantity",
        description: "Specify how many units the recurring line item contains.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-line-price"]',
        title: "Enter the price",
        description: "Enter the item price. The invoice amount is calculated from all item quantities and prices.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-notes"]',
        title: "Add optional notes or terms",
        description: "Provide notes visible to the member on generated invoices, if needed.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-total"]',
        title: "Review the recurring total",
        description: "Confirm the subtotal and total match the amount you intend to charge each billing cycle.",
        path: "/admin/invoices/recurring/new",
    },
    {
        selector: '[data-tour="recurring-save"]',
        title: "Review before saving",
        description: "Finish this guide first. Then, only if intended, click Save and continue yourself. An Active schedule can generate and email REAL invoices when the scheduler runs; the guide never saves a schedule.",
        path: "/admin/invoices/recurring/new",
    },
];

export const GUIDED_TOURS: readonly GuidedTour[] = [
    {
        id: "members-directory",
        title: "Explore Registered Members",
        path: "/admin/membership",
        helpTopicId: "users",
        roles: ["admin"],
        steps: [
            { selector: '[data-tour="members-table"]', title: "Review registered members", description: "Review names, usernames, contact and registration details, membership roles and join dates. The list contains personal information; share it only with authorized personnel.", path: "/admin/membership" },
            { selector: '[data-tour="members-sort"]', title: "Sort the directory", description: "Click a table header, such as Name, to sort in ascending or descending order. Sorting does not change member records.", path: "/admin/membership" },
            { selector: '[data-tour="members-edit-link"]', title: "Open an existing profile", description: "Edit profile opens the first listed member. Check whose record you are opening. The guide does not change the profile.", path: "/admin/membership" },
            { selector: '[data-tour="members-delete"]', title: "Understand Delete member", description: "Delete member permanently removes saved registration data after confirmation. Never test deletion as part of this walkthrough.", path: "/admin/membership" },
            { selector: '[data-tour="members-pagination"]', title: "Find additional members", description: "If there are more than 25 members, use Previous and Next to review additional records.", path: "/admin/membership" },
        ],
    },
    {
        id: "members-edit",
        title: "Review and Edit Member Profile",
        path: "/admin/membership",
        helpTopicId: "users",
        roles: ["admin"],
        steps: [
            { selector: '[data-tour="members-edit-link"]', title: "Open the member profile", description: "Click Edit profile on the first listed member to continue to the edit form. Verify the member's identity before proceeding.", path: "/admin/membership", advanceOnClick: true },
            { selector: '[data-tour="member-edit-summary"]', title: "Confirm the correct member", description: "Verify the member's username, role, and active status before editing. This form does not assign roles.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-identity"]', title: "Review name and email", description: "Check the member's full name and email address. Changes require a separate Save.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-address"]', title: "Review address", description: "Check the required registration address.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-sizes"]', title: "Review clothing sizes", description: "Verify the member's T-shirt and jacket sizes.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-preferences"]', title: "Review preferences", description: "Confirm favorite color, gender, and birthday in MM/DD format.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-save"]', title: "Review before saving", description: "Finish the walkthrough before clicking Save changes. Saving updates a real member profile; the guide never saves.", path: "/admin/membership/[id]/edit" },
        ],
    },
    {
        id: "members-edit-on-page",
        title: "Review and Edit Member Profile",
        path: "/admin/membership/[id]/edit",
        helpTopicId: "users",
        roles: ["admin"],
        steps: [
            { selector: '[data-tour="member-edit-summary"]', title: "Confirm the correct member", description: "Verify the member's username, role, and active status before editing. This form does not assign roles.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-identity"]', title: "Review name and email", description: "Check the member's full name and email address. Changes require a separate Save.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-address"]', title: "Review address", description: "Check the required registration address.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-sizes"]', title: "Review clothing sizes", description: "Verify the member's T-shirt and jacket sizes.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-preferences"]', title: "Review preferences", description: "Confirm favorite color, gender, and birthday in MM/DD format.", path: "/admin/membership/[id]/edit" },
            { selector: '[data-tour="member-edit-save"]', title: "Review before saving", description: "Finish the walkthrough before clicking Save changes. Saving updates a real member profile; the guide never saves.", path: "/admin/membership/[id]/edit" },
        ],
    },
    {
        id: "member-invitations",
        title: "Create and Track Member Invitations",
        path: "/admin/member-invites",
        helpTopicId: "invites",
        roles: ["admin"],
        steps: [
            { selector: '[data-tour="invites-name"]', title: "Enter invitee name", description: "Provide the potential member's first and last name.", path: "/admin/member-invites" },
            { selector: '[data-tour="invites-contact"]', title: "Enter contact details", description: "Enter a 10-digit phone number and a valid email address. Confirm the recipient before creating a private invitation.", path: "/admin/member-invites" },
            { selector: '[data-tour="invites-create"]', title: "Create invite link only when ready", description: "Finish this guide before selecting Create Invite Link. This action creates a real private registration link and may send email automatically; the guide never submits.", path: "/admin/member-invites" },
            { selector: '[data-tour="invites-history"]', title: "Review invitation history", description: "Review Created, Sent, Opened and Registered status indicators and timestamp columns. Email-open tracking is best-effort and does not prove a person opened it.", path: "/admin/member-invites" },
            { selector: '[data-tour="invites-refresh"]', title: "Refresh invitation status", description: "Refresh reloads invitation history; the guide does not trigger the reload.", path: "/admin/member-invites" },
        ],
    },
    {
        id: "member-roles-overview",
        title: "Understand Roles Manager",
        path: "/admin/roles-manager",
        helpTopicId: "roles",
        roles: ["admin"],
        steps: [
            { selector: '[data-tour="roles-admin"]', title: "Review administrator access", description: "The Admin Role section controls its Access/View All setting. Treat access changes as security-sensitive.", path: "/admin/roles-manager" },
            { selector: '[data-tour="roles-managed"]', title: "Review other role permissions", description: "Secretary, treasure, and member settings specify access to dashboard, menu, and Ideas & Activities items. This page edits role permission settings, not individual users' assigned roles.", path: "/admin/roles-manager" },
            { selector: '[data-tour="roles-save"]', title: "Save role settings only when intended", description: "Finish the guide before choosing Save Role Settings. Saving changes access configuration; the guide never submits it.", path: "/admin/roles-manager" },
        ],
    },

    {
        id: "transactions-overview",
        title: "Explore Transactions",
        path: "/admin/transactions",
        helpTopicId: "transactions",
        roles: ["admin", "treasurer"],
        steps: [
            { selector: '[data-tour="transactions-summary"]', title: "Review the displayed net total", description: "All accounts is a calculated sum of currently filtered transactions (income minus expenses), not a reconciled bank balance. Reconciliation is not enabled here.", path: "/admin/transactions" },
            { selector: '[data-tour="transactions-filter"]', title: "Filter transaction type", description: "Click Filter to cycle between All, income and expense. This changes the displayed list only.", path: "/admin/transactions" },
            { selector: '[data-tour="transactions-sort"]', title: "Sort by date", description: "Sort changes date ordering between newest and oldest first.", path: "/admin/transactions" },
            { selector: '[data-tour="transactions-search"]', title: "Search transactions", description: "Search transaction descriptions, payment accounts and categories.", path: "/admin/transactions" },
            { selector: '[data-tour="transactions-table"]', title: "Read transaction rows", description: "Review date, description, account, category and amount. Select a description to open its linked invoice or vendor bill.", path: "/admin/transactions" },
            { selector: '[data-tour="transactions-select"]', title: "Select transactions", description: "Select all or individual rows for review. The bulk action icons currently have no handlers and should not be relied on.", path: "/admin/transactions" },
            { selector: '[data-tour="transactions-actions"]', title: "Open a row's Actions menu", description: "Choose the first visible row's Actions dropdown to find Edit more details, Upload receipt, or Delete when available. Delete removes a real transaction and is not part of the guide.", path: "/admin/transactions" },
        ],
    },
    {
        id: "transactions-edit",
        title: "Review and Edit a Transaction",
        path: "/admin/transactions",
        helpTopicId: "transactions",
        roles: ["admin", "treasurer"],
        steps: [
            { selector: '[data-tour="transactions-edit-actions"]', title: "Open an eligible transaction", description: "Click Actions for the first visible non-donation transaction. Donations have a separate record view.", path: "/admin/transactions", advanceOnClick: true },
            { selector: '[data-tour="transactions-edit-link"]', title: "Open Edit more details", description: "Click Edit more details to open that transaction's existing edit form. The guide follows you to the form.", path: "/admin/transactions", advanceOnClick: true },
            { selector: '[data-tour="transaction-edit-date"]', title: "Verify the transaction date", description: "Review the date. Imported historical invoice payments without ledger details remain read-only; some bill-history entries require verification.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-description"]', title: "Review the description", description: "Confirm the transaction description matches the original record.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-account"]', title: "Review payment account", description: "Choose the correct account from available accounts if edits are allowed.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-type"]', title: "Review deposit or withdrawal", description: "The type identifies money received or spent. Linked invoice or bill direction changes require a separate reversal.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-amount"]', title: "Confirm the amount", description: "Check the original payment amount. Changes to financial transactions affect reports and must be intentional.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-category"]', title: "Review the category", description: "Confirm the category used for transaction reporting.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-contact"]', title: "Check the linked customer or vendor", description: "This linked contact field is read-only.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-memo"]', title: "Review notes", description: "Add or correct optional notes if editing is permitted.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-receipt"]', title: "Review receipt upload", description: "You can attach a receipt independently. Selecting or dropping a file uploads it immediately; the guide never uploads files.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-save"]', title: "Finish before saving", description: "Save can change real transaction records. Historical bill entries may require date verification, and imported invoice history may be read-only. The guide never submits.", path: "/admin/transactions/[key]/edit" },
        ],
    },
    {
        id: "transactions-edit-on-page",
        title: "Review and Edit a Transaction",
        path: "/admin/transactions/[key]/edit",
        helpTopicId: "transactions",
        roles: ["admin", "treasurer"],
        steps: [
            { selector: '[data-tour="transaction-edit-date"]', title: "Verify the transaction date", description: "Review the date. Imported historical invoice payments without ledger details remain read-only; some bill-history entries require verification.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-description"]', title: "Review the description", description: "Confirm the transaction description matches the original record.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-account"]', title: "Review payment account", description: "Choose the correct account from available accounts if edits are allowed.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-type"]', title: "Review deposit or withdrawal", description: "The type identifies money received or spent. Linked invoice or bill direction changes require a separate reversal.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-amount"]', title: "Confirm the amount", description: "Check the original payment amount. Changes to financial transactions affect reports and must be intentional.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-category"]', title: "Review the category", description: "Confirm the category used for transaction reporting.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-contact"]', title: "Check the linked customer or vendor", description: "This linked contact field is read-only.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-memo"]', title: "Review notes", description: "Add or correct optional notes if editing is permitted.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-receipt"]', title: "Review receipt upload", description: "You can attach a receipt independently. Selecting or dropping a file uploads it immediately; the guide never uploads files.", path: "/admin/transactions/[key]/edit" },
            { selector: '[data-tour="transaction-edit-save"]', title: "Finish before saving", description: "Save can change real transaction records. Historical bill entries may require date verification, and imported invoice history may be read-only. The guide never submits.", path: "/admin/transactions/[key]/edit" },
        ],
    },

    {
        id: "vendor-bills-review",
        title: "Review Vendor Bills and Payment Status",
        path: "/admin/vendors/bills",
        helpTopicId: "vendor-bills",
        roles: ["admin", "treasurer"],
        steps: [
            { selector: '[data-tour="vendor-bill-filter"]', title: "Filter vendor bills", description: "Choose a vendor or bill-date range to focus on relevant vendor bills. This filters the list, not accounting data.", path: "/admin/vendors/bills" },
            { selector: '[data-tour="vendor-bills-table"]', title: "Review bill status and balances", description: "The list shows Paid, Partially Paid, and Unpaid statuses, the amount due, and each bill's total. This is a bill summary, not an itemized payment-history ledger.", path: "/admin/vendors/bills" },
            { selector: '[data-tour="vendor-bills-pages"]', title: "Review more bills", description: "Use the pagination buttons if there are more than 25 matching bills. The guide never records any payment.", path: "/admin/vendors/bills" },
        ],
    },

    { id: "vendor-directory", title: "Explore Vendor Management", path: "/admin/vendors", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="vendor-directory-table"]', title: "Review the vendor directory", description: "The directory shows vendor names, email addresses, and available actions. Direct deposit is currently marked Not available.", path: "/admin/vendors" },
            { selector: '[data-tour="vendor-directory-add"]', title: "Add a vendor", description: "Choose Add a vendor to open the vendor form. This guide only explains where to start; it does not create a record.", path: "/admin/vendors" },
            { selector: '[data-tour="vendor-directory-actions"]', title: "Review vendor actions", description: "On a vendor row, use the Actions menu to Edit, Create bill, or Delete. Delete can permanently remove a vendor; the guide will not click it.", path: "/admin/vendors" },
            { selector: '[data-tour="vendor-directory-bill"]', title: "Create a bill for a vendor", description: "The Create bill link opens a form for the selected vendor. Bill creation is a separate financial action.", path: "/admin/vendors" },
    ] },
    { id: "vendor-create", title: "Add a Vendor", path: "/admin/vendors", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="vendor-directory-add"]', title: "Open the vendor form", description: "Click Add a vendor to open the form. The guide will continue on the next page.", path: "/admin/vendors", advanceOnClick: true },
            { selector: '[data-tour="vendor-name"]', title: "Enter vendor name", description: "Enter the legal or recognizable vendor name. This is required.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-type"]', title: "Select vendor type", description: "Choose Regular or 1099-NEC contractor as appropriate for your records. This does not create tax forms.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-contact"]', title: "Review contact details", description: "Provide optional contact name, email, address and location details used in your vendor directory.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-currency"]', title: "Review currency", description: "Currency currently offers USD.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-notes"]', title: "Optional additional information", description: "Add notes useful for managing this vendor.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-save"]', title: "Review before saving", description: "Finish the guide first. Saving separately creates or updates a REAL vendor record; the guide never submits the form.", path: "/admin/vendors/new" },
    ] },
    { id: "vendor-create-on-page", title: "Add a Vendor", path: "/admin/vendors/new", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="vendor-name"]', title: "Enter vendor name", description: "Enter the legal or recognizable vendor name. This is required.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-type"]', title: "Select vendor type", description: "Choose Regular or 1099-NEC contractor as appropriate for your records. This does not create tax forms.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-contact"]', title: "Review contact details", description: "Provide optional contact name, email, address and location details used in your vendor directory.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-currency"]', title: "Review currency", description: "Currency currently offers USD.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-notes"]', title: "Optional additional information", description: "Add notes useful for managing this vendor.", path: "/admin/vendors/new" },
            { selector: '[data-tour="vendor-save"]', title: "Review before saving", description: "Finish the guide first. Saving separately creates or updates a REAL vendor record; the guide never submits the form.", path: "/admin/vendors/new" },
    ] },
    { id: "vendor-edit", title: "Edit an Existing Vendor", path: "/admin/vendors", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="vendor-directory-actions"]', title: "Open vendor actions", description: "Check the highlighted vendor row, then click its Actions dropdown. This step does not edit or delete the vendor.", path: "/admin/vendors", advanceOnClick: true },
            { selector: '[data-tour="vendor-directory-edit"]', title: "Open Edit", description: "Click Edit to open the selected vendor record and continue the guide.", path: "/admin/vendors", advanceOnClick: true },
            { selector: '[data-tour="vendor-name"]', title: "Enter vendor name", description: "Enter the legal or recognizable vendor name. This is required.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-type"]', title: "Select vendor type", description: "Choose Regular or 1099-NEC contractor as appropriate for your records. This does not create tax forms.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-contact"]', title: "Review contact details", description: "Provide optional contact name, email, address and location details used in your vendor directory.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-currency"]', title: "Review currency", description: "Currency currently offers USD.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-notes"]', title: "Optional additional information", description: "Add notes useful for managing this vendor.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-save"]', title: "Review before saving", description: "Finish the guide first. Saving separately creates or updates a REAL vendor record; the guide never submits the form.", path: "/admin/vendors/[id]/edit" },
    ] },
    { id: "vendor-edit-on-page", title: "Edit an Existing Vendor", path: "/admin/vendors/[id]/edit", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="vendor-name"]', title: "Enter vendor name", description: "Enter the legal or recognizable vendor name. This is required.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-type"]', title: "Select vendor type", description: "Choose Regular or 1099-NEC contractor as appropriate for your records. This does not create tax forms.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-contact"]', title: "Review contact details", description: "Provide optional contact name, email, address and location details used in your vendor directory.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-currency"]', title: "Review currency", description: "Currency currently offers USD.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-notes"]', title: "Optional additional information", description: "Add notes useful for managing this vendor.", path: "/admin/vendors/[id]/edit" },
            { selector: '[data-tour="vendor-save"]', title: "Review before saving", description: "Finish the guide first. Saving separately creates or updates a REAL vendor record; the guide never submits the form.", path: "/admin/vendors/[id]/edit" },
    ] },
    { id: "vendor-create-bill", title: "Create a Vendor Bill", path: "/admin/vendors", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="vendor-directory-bill"]', title: "Open Create bill", description: "Click Create bill on the appropriate vendor row to open the bill form. The guide follows you to that vendor's bill form.", path: "/admin/vendors", advanceOnClick: true },
            { selector: '[data-tour="bill-vendor"]', title: "Confirm the vendor", description: "Check that the bill is assigned to the intended vendor.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-date"]', title: "Set bill date", description: "Enter the date shown on the vendor bill.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-due"]', title: "Set due date", description: "Enter when the bill must be paid.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-reference"]', title: "Enter reference information", description: "Add a P.O./S.O. number and bill number when provided by the vendor.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-notes"]', title: "Optional notes", description: "Use Notes to capture additional context before saving.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-items"]', title: "Complete bill line items", description: "Enter item, expense category, description, quantity, price and tax. Review all rows; more can be added.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-totals"]', title: "Review amount due", description: "Confirm subtotal, taxes and Amount Due. New bills show Total Paid as zero.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-save"]', title: "Review before saving", description: "Finish the guide before taking action. Save creates a real vendor bill; the walkthrough never submits it.", path: "/admin/vendors/[id]/create-bill" },
    ] },
    { id: "vendor-create-bill-on-page", title: "Create a Vendor Bill", path: "/admin/vendors/[id]/create-bill", helpTopicId: "vendors", roles: ["admin", "treasurer"], steps: [
            { selector: '[data-tour="bill-vendor"]', title: "Confirm the vendor", description: "Check that the bill is assigned to the intended vendor.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-date"]', title: "Set bill date", description: "Enter the date shown on the vendor bill.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-due"]', title: "Set due date", description: "Enter when the bill must be paid.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-reference"]', title: "Enter reference information", description: "Add a P.O./S.O. number and bill number when provided by the vendor.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-notes"]', title: "Optional notes", description: "Use Notes to capture additional context before saving.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-items"]', title: "Complete bill line items", description: "Enter item, expense category, description, quantity, price and tax. Review all rows; more can be added.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-totals"]', title: "Review amount due", description: "Confirm subtotal, taxes and Amount Due. New bills show Total Paid as zero.", path: "/admin/vendors/[id]/create-bill" },
            { selector: '[data-tour="bill-save"]', title: "Review before saving", description: "Finish the guide before taking action. Save creates a real vendor bill; the walkthrough never submits it.", path: "/admin/vendors/[id]/create-bill" },
    ] },
    {
        id: "report-income-overview",
        title: "Explore Income by Customer",
        path: "/admin/reports/income-by-customer",
        helpTopicId: "reports",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="income-date-range"]',
                title: "Choose a reporting period",
                description: "Select a calendar year, quarter, month, or Custom date range.",
                path: "/admin/reports/income-by-customer",
            },
            {
                selector: '[data-tour="income-from-date"]',
                title: "Review the start date",
                description: "Check the start date. Editing dates changes the selection, not the loaded report until you select Update Report.",
                path: "/admin/reports/income-by-customer",
            },
            {
                selector: '[data-tour="income-to-date"]',
                title: "Review the end date",
                description: "Check the end date for the reporting period.",
                path: "/admin/reports/income-by-customer",
            },
            {
                selector: '[data-tour="income-update"]',
                title: "Refresh the report",
                description: "Click Update Report separately when ready to load income for the selected dates. The guide does not load or modify data.",
                path: "/admin/reports/income-by-customer",
            },
            {
                selector: '[data-tour="income-table"]',
                title: "Understand income columns",
                description: "All Income shows overall invoiced income; Paid Income shows income recorded as paid. Click an amount outside this guide to drill down to Account Transactions.",
                path: "/admin/reports/income-by-customer",
            },
            {
                selector: '[data-tour="income-export"]',
                title: "Export a report",
                description: "Export becomes available when the report has rows. CSV downloads the table; PDF uses your browser's print dialog. The guide does not export data.",
                path: "/admin/reports/income-by-customer",
            },
        ],
    },
    {
        id: "report-transactions-overview",
        title: "Explore Account Transactions",
        path: "/admin/reports/account-transactions",
        helpTopicId: "reports",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="transactions-date-range"]',
                title: "Choose the date range",
                description: "Select the calendar year or a custom From/To range for transaction reporting.",
                path: "/admin/reports/account-transactions",
            },
            {
                selector: '[data-tour="transactions-type"]',
                title: "Choose a report basis",
                description: "Accrual includes paid and unpaid invoice activity; Cash Basis shows paid activity; Cash Only is another available cash view.",
                path: "/admin/reports/account-transactions",
            },
            {
                selector: '[data-tour="transactions-contact"]',
                title: "Select a contact",
                description: "Choose All Contacts or one customer to limit the report.",
                path: "/admin/reports/account-transactions",
            },
            {
                selector: '[data-tour="transactions-update"]',
                title: "Update the results",
                description: "Click Update Report separately to reload transactions for the selected period and report basis.",
                path: "/admin/reports/account-transactions",
            },
            {
                selector: '[data-tour="transactions-table"]',
                title: "Read debits, credits and balance",
                description: "Review the dated entries and the running balance. Cash and accrual modes interpret debits and credits differently; historical undated imports may be excluded in cash views.",
                path: "/admin/reports/account-transactions",
            },
            {
                selector: '[data-tour="transactions-export"]',
                title: "Print or export",
                description: "The Export control opens the browser print dialog. The walkthrough does not print or export anything.",
                path: "/admin/reports/account-transactions",
            },
        ],
    },
    {
        id: "report-balance-overview",
        title: "Explore the Balance Sheet",
        path: "/admin/reports/balance-sheet",
        helpTopicId: "reports",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="balance-asof-year"]',
                title: "Choose an as-of year",
                description: "Choose the reporting year to set the balance sheet period.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-asof-date"]',
                title: "Check the as-of date",
                description: "Balance Sheet reports represent amounts as of a specific date, rather than a From/To period.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-type"]',
                title: "Choose accrual or cash",
                description: "Compare Accrual (Paid & Unpaid) and Cash Basis (Recorded Payments) for the chosen date.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-update"]',
                title: "Update the balance sheet",
                description: "Click Update Report separately to reload the results; the guide does not trigger data changes.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-summary"]',
                title: "Review high-level totals",
                description: "Review Cash and Bank, amounts To be received, and Total Invoices and Donations. These figures are based on recorded application data.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-views"]',
                title: "Switch Summary and Details",
                description: "Summary is condensed. Details shows additional lines and links to Account Transactions. The guide does not switch tabs automatically.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-notes"]',
                title: "Read the data caveats",
                description: "Calculated Cash and Bank is not a reconciled bank balance. Review Report data notes before using these amounts for decisions.",
                path: "/admin/reports/balance-sheet",
            },
            {
                selector: '[data-tour="balance-export"]',
                title: "Export the report",
                description: "When a report is available, Export offers CSV and PDF. The guide never downloads or prints financial data.",
                path: "/admin/reports/balance-sheet",
            },
        ],
    },
    {
        id: "vendor-bill-record-payment",
        title: "Record a Vendor Bill Payment",
        path: "/admin/vendors/bills",
        helpTopicId: "vendor-bills",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="vendor-bill-filter"]',
                title: "Locate the vendor bill",
                description: "Filter by vendor and bill dates if needed. Find the correct bill with an unpaid balance before recording a payment.",
                path: "/admin/vendors/bills",
            },
            {
                selector: '[data-tour="vendor-bill-record-button"]',
                title: "Open the payment form",
                description: "Check the vendor and remaining amount on the highlighted row. Click Record a payment to open the form. The guide will not record a payment.",
                path: "/admin/vendors/bills",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour="vendor-bill-payment-method"]',
                title: "Choose the payment method",
                description: "Choose how you paid the vendor. This form records an existing payment; it does not transfer money.",
                path: "/admin/vendors/bills",
            },
            {
                selector: '[data-tour="vendor-bill-payment-amount"]',
                title: "Verify the amount",
                description: "The amount starts at the remaining bill balance. Enter the actual amount paid and review the balance carefully, especially for partial payments.",
                path: "/admin/vendors/bills",
            },
            {
                selector: '[data-tour="vendor-bill-payment-date"]',
                title: "Verify payment date",
                description: "Select the date on which the vendor was paid.",
                path: "/admin/vendors/bills",
            },
            {
                selector: '[data-tour="vendor-bill-payment-account"]',
                title: "Choose the payment account",
                description: "Select the account from which the vendor payment was made.",
                path: "/admin/vendors/bills",
            },
            {
                selector: '[data-tour="vendor-bill-payment-memo"]',
                title: "Add an optional memo",
                description: "Enter a payment reference, check number, or other useful notes if available.",
                path: "/admin/vendors/bills",
            },
            {
                selector: '[data-tour="vendor-bill-payment-save"]',
                title: "Review before saving",
                description: "Finish this walkthrough first. Then verify the vendor, bill, amount, date, method, and account. Click Save separately only if you intend to record a REAL payment. The guide never saves payments.",
                path: "/admin/vendors/bills",
            },
        ],
    },

    {
        id: "recurring-create",
        title: "Create a Recurring Invoice",
        path: "/admin/invoices/recurring",
        helpTopicId: "recurring",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="recurring-create-link"]',
                title: "Open a new recurring schedule",
                description: "Click Create a recurring invoice to open the form. The guide will continue on the next page.",
                path: "/admin/invoices/recurring",
                advanceOnClick: true,
            },
            ...RECURRING_CREATE_STEPS,
        ],
    },
    {
        id: "recurring-create-on-page",
        title: "Create a Recurring Invoice",
        path: "/admin/invoices/recurring/new",
        helpTopicId: "recurring",
        roles: ["admin", "treasurer"],
        steps: RECURRING_CREATE_STEPS,
    },
    {
        id: "recurring-manage",
        title: "Manage Existing Recurring Invoices",
        path: "/admin/invoices/recurring",
        helpTopicId: "recurring",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="recurring-filter-tabs"]',
                title: "Filter recurring schedules",
                description: "Switch between Active, Draft, and All recurring invoices to locate the schedule you need.",
                path: "/admin/invoices/recurring",
            },
            {
                selector: '[data-tour="recurring-row-actions"]',
                title: "Open a schedule's Actions",
                description: "Check the customer and schedule in the first displayed row before clicking the highlighted Actions menu. Change filters or pages to locate a different schedule.",
                path: "/admin/invoices/recurring",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour="recurring-actions-menu"]',
                title: "Review available actions",
                description: "You can View, Edit, End, Duplicate, or Delete permanently. Ending preserves history; permanent deletion removes schedule and scheduler history. Do not select a destructive action during this tutorial.",
                path: "/admin/invoices/recurring",
            },
        ],
    },
    {
        id: "recurring-scheduler-overview",
        title: "Understand Recurring Invoice Scheduling",
        path: "/admin/invoices/recurring",
        helpTopicId: "recurring",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="recurring-scheduler-toggle"]',
                title: "Open scheduler status",
                description: "Click Scheduler status to review the scheduler's configuration and processing history. This does not generate any invoices.",
                path: "/admin/invoices/recurring",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour="recurring-scheduler-summary"]',
                title: "Review automatic scheduling",
                description: "The configured Hostinger cron is intended to call the protected scheduler at 5 minutes past every hour. A configured secret alone does not prove that Hostinger scheduled the cron job.",
                path: "/admin/invoices/recurring",
            },
            {
                selector: '[data-tour="recurring-scheduler-run"]',
                title: "Understand the manual run",
                description: "Run due invoices now is a LIVE action: it can generate and email real invoices. This walkthrough does not click it. Use it only when you intentionally want to process due schedules.",
                path: "/admin/invoices/recurring",
            },
            {
                selector: '[data-tour="recurring-scheduler-history"]',
                title: "Review processing history",
                description: "See previous scheduled runs, invoice results and attempts. Finish the guide without running the scheduler.",
                path: "/admin/invoices/recurring",
            },
        ],
    },

    {
        id: "invoice-dashboard-overview",
        title: "Explore the Invoice Dashboard",
        path: "/admin/invoices",
        helpTopicId: "invoices",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="invoice-status-tabs"]',
                title: "Find invoices by status",
                description: "Use Unpaid, Draft, Paid, or All invoices to find the invoice you need.",
                path: "/admin/invoices",
            },
            {
                selector: '[data-tour="invoice-actions-column"]',
                title: "Locate invoice actions",
                description: "Each row has an Actions dropdown. Choose the Record an Invoice Payment guide to learn the full process.",
                path: "/admin/invoices",
            },
        ],
    },
    {
        id: "invoice-create",
        title: "Create a New Invoice",
        path: "/admin/invoices",
        helpTopicId: "new-invoice",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="invoice-create-link"]',
                title: "Open the new invoice form",
                description: "Click Create an invoice to open the real New invoice form. This walkthrough will continue on the next page.",
                path: "/admin/invoices",
                advanceOnClick: true,
            },
            ...CREATE_INVOICE_FORM_STEPS,
        ],
    },
    {
        id: "invoice-create-on-page",
        title: "Create a New Invoice",
        path: "/admin/invoices/new",
        helpTopicId: "new-invoice",
        roles: ["admin", "treasurer"],
        steps: CREATE_INVOICE_FORM_STEPS,
    },
    {
        id: "invoice-reverse-payment",
        title: "Reverse an Incorrect Invoice Payment",
        path: "/admin/invoices",
        helpTopicId: "invoices",
        roles: ["admin"],
        steps: [
            {
                selector: '[data-tour="invoice-reversal-paid-tab"]',
                title: "Select Paid invoices",
                description: "Click the highlighted Paid tab to find invoices with recorded payments. For a partially paid invoice, use All invoices afterward. Verify the invoice number before opening Actions.",
                path: "/admin/invoices",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour~="invoice-reversal-actions"]',
                title: "Open the invoice Actions menu",
                description: "Confirm the invoice in the highlighted row and click Actions. This guide never picks a payment for you.",
                path: "/admin/invoices",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour="invoice-reversal-link"]',
                title: "Choose Reverse incorrect payment",
                description: "Click Reverse incorrect payment to open the existing reversal screen. You will still need to select the specific recorded payment before any reversal can occur.",
                path: "/admin/invoices",
                advanceOnClick: true,
            },
            ...REVERSE_PAYMENT_FORM_STEPS,
        ],
    },
    {
        id: "invoice-reverse-on-page",
        title: "Reverse an Incorrect Invoice Payment",
        path: "/admin/invoices/[id]/reverse-payment",
        helpTopicId: "invoices",
        roles: ["admin"],
        steps: REVERSE_PAYMENT_FORM_STEPS,
    },
    {
        id: "invoice-record-payment",
        title: "Record an Invoice Payment",
        path: "/admin/invoices",
        helpTopicId: "invoices",
        roles: ["admin", "treasurer"],
        steps: [
            {
                selector: '[data-tour="invoice-status-tabs"]',
                title: "Locate an outstanding invoice",
                description: "Choose Unpaid, then find the invoice whose payment you want to record. The guide highlights the first eligible invoice on this page; change filters or pages if needed.",
                path: "/admin/invoices",
            },
            {
                selector: '[data-tour="invoice-payment-actions"]',
                title: "Open this invoice's Actions menu",
                description: "Check the invoice number on the row before clicking its highlighted Actions dropdown. Only an invoice with an outstanding balance is eligible.",
                path: "/admin/invoices",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour="invoice-payment-record-link"]',
                title: "Choose Record payment",
                description: "Click Record payment. You will move to that invoice's payment form, and the guide will continue there.",
                path: "/admin/invoices",
                advanceOnClick: true,
            },
            {
                selector: '[data-tour="payment-date"]',
                title: "Verify payment date",
                description: "Check the date the payment was received. Change it if needed.",
                path: "/admin/invoices/[id]/record-payment",
            },
            {
                selector: '[data-tour="payment-amount"]',
                title: "Review the amount",
                description: "The amount defaults to the remaining invoice balance. Enter the actual payment amount; smaller amounts are allowed for partial payments.",
                path: "/admin/invoices/[id]/record-payment",
            },
            {
                selector: '[data-tour="payment-method"]',
                title: "Choose the payment method",
                description: "Select the method used for this payment. You can create an option using Add method if necessary.",
                path: "/admin/invoices/[id]/record-payment",
            },
            {
                selector: '[data-tour="payment-account"]',
                title: "Choose the receiving account",
                description: "Select the account where the payment was deposited.",
                path: "/admin/invoices/[id]/record-payment",
            },
            {
                selector: '[data-tour="payment-memo"]',
                title: "Add an optional receipt memo",
                description: "Enter any reference or note that should appear on the payment receipt.",
                path: "/admin/invoices/[id]/record-payment",
            },
            {
                selector: '[data-tour="payment-submit"]',
                title: "Review and submit when ready",
                description: "Double-check the invoice, date, amount, method, and account. Finish this walkthrough, then personally click Submit only if you intend to record a real payment. This guide NEVER submits payments.",
                path: "/admin/invoices/[id]/record-payment",
            },
        ],
    },
];

export function permittedTours(role: string, pathname: string): GuidedTour[] {
    return GUIDED_TOURS.filter((tour) => (tour.path === pathname || (tour.path === "/admin/invoices/[id]/reverse-payment" && stepMatchesPath("/admin/invoices/[id]/reverse-payment", pathname)) || (tour.path === "/admin/vendors/[id]/edit" && stepMatchesPath("/admin/vendors/[id]/edit", pathname)) || (tour.path === "/admin/vendors/[id]/create-bill" && stepMatchesPath("/admin/vendors/[id]/create-bill", pathname)) || (tour.path === "/admin/transactions/[key]/edit" && stepMatchesPath("/admin/transactions/[key]/edit", pathname)) || (tour.path === "/admin/membership/[id]/edit" && stepMatchesPath("/admin/membership/[id]/edit", pathname))) && tour.roles.some((allowed) => allowed === role));
}
