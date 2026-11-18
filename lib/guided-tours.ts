export type TourRole = "admin" | "treasurer" | "secretary" | "member";

export type GuidedTourStep = {
    selector: string;
    title: string;
    description: string;
};

export type GuidedTour = {
    id: string;
    title: string;
    path: string;
    helpTopicId: string;
    roles: readonly TourRole[];
    steps: readonly GuidedTourStep[];
};

// Phase 1 provides a safe, read-only orientation tour. Payment entry is Phase 2.
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
            },
            {
                selector: '[data-tour="invoice-actions-column"]',
                title: "Locate invoice actions",
                description: "Each invoice row has an Actions menu. Phase 2 will guide you through selecting Record payment and completing the payment form.",
            },
        ],
    },
];

export function permittedTours(role: string, pathname: string): GuidedTour[] {
    return GUIDED_TOURS.filter((tour) => tour.path === pathname && tour.roles.some((allowed) => allowed === role));
}
