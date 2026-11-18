export type TourRole = "admin" | "treasurer" | "secretary" | "member";

export type GuidedTourStep = {
    selector: string;
    title: string;
    description: string;
    /** Route pattern: dynamic invoice ID is accepted only on the recording page. */
    path: "/admin/invoices" | "/admin/invoices/[id]/record-payment";
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
    if (path === "/admin/invoices") return pathname === path;
    return /^\/admin\/invoices\/\d+\/record-payment$/.test(pathname);
}

export const GUIDED_TOURS: readonly GuidedTour[] = [
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
    return GUIDED_TOURS.filter((tour) => tour.path === pathname && tour.roles.some((allowed) => allowed === role));
}
