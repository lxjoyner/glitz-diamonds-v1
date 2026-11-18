export type TourRole = "admin" | "treasurer" | "secretary" | "member";

export type GuidedTourStep = {
    selector: string;
    title: string;
    description: string;
    /** Route pattern: dynamic invoice ID is accepted only on the recording page. */
    path: "/admin/invoices" | "/admin/invoices/new" | "/admin/invoices/[id]/record-payment" | "/admin/invoices/[id]/reverse-payment";
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
    if (path === "/admin/invoices" || path === "/admin/invoices/new") return pathname === path;
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
                selector: '[data-tour="invoice-status-tabs"]',
                title: "Find an invoice with recorded payments",
                description: "Select Paid or All invoices to locate the correct invoice. The highlighted Actions menu belongs to the first visible invoice with a paid amount. Check its invoice number before proceeding.",
                path: "/admin/invoices",
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
    return GUIDED_TOURS.filter((tour) => (tour.path === pathname || (tour.path === "/admin/invoices/[id]/reverse-payment" && /^\/admin\/invoices\/\d+\/reverse-payment$/.test(pathname))) && tour.roles.some((allowed) => allowed === role));
}
