# Phase 2 — Interactive Invoice Payment Walkthrough

## Features
- The **Show Me How > Record an Invoice Payment** guide starts on `/admin/invoices`, or from the Invoice Dashboard topic in Help Center.
- Select Unpaid, locate a valid invoice, and click the highlighted Actions button; the guide waits for **actual** clicks rather than simulating them.
- Click the highlighted **Record payment** menu item to navigate to `/admin/invoices/{id}/record-payment`.
- Guide state continues across Next.js navigation or a full page load using **sessionStorage** (tour ID and step number only; no financial details).
- On the payment form, it highlights Date, Amount, Method, Account, Memo, and Submit.
- **Finish guide** exits the walkthrough without submitting. The user must review and click Submit themselves. No tour code invokes payment APIs or changes input values.
- Existing dashboard overview tour remains available.
- Roles and Help enabled state are validated against `/api/help/topics` each time the route changes. The payment guide is Admin/Treasurer-only. Disabled Help and logged-out sessions do not resume tours.
- No dependencies, migrations, or changes to accounting/payment submission.

## Local QA
1. `git fetch origin` and `git switch feature/guided-help-invoice-payment-phase2` from repo root; `npm run build`; `npm run dev`.
2. Log in as Admin (then Treasurer), enable Help. On Invoice Dashboard click **Show Me How > Record an Invoice Payment**.
3. Open **Unpaid**, ensure at least one outstanding non-draft, non-void invoice is visible; try filters and pagination.
4. Click the highlighted **Actions** for the selected invoice. Verify guide moves to **Record payment** link only after click. Selecting it must open that SAME invoice's form.
5. Confirm the walkthrough continues on the payment form and steps through Date, Amount, Method, Account, Memo, and Submit. Use Back, Next, Exit, Escape, and Finish.
6. Before submitting, finish the guide and confirm it has **not** changed any payment or sent any email. For a real submission test, use a controlled test invoice and authorized test data only.
7. Test partial payment, blank required fields, a paid invoice, an empty invoice list, slow API responses, narrow/mobile layout, and browser zoom.
8. Navigate away mid-guide; test reload and logout, Help setting disabled, Member and Secretary accounts. No unauthorized guide should appear.
9. From Help Center, click **Show Me How: Record Payment**; verify opening at step 1.
10. Verify existing Invoice Dashboard overview still works and payment posting/receipt logic remains unchanged.
11. Known repository-wide lint errors may remain; check touched files with `npx eslint components/GuidedHelpProvider.tsx lib/guided-tours.ts app/help/page.tsx 'app/admin/invoices/[id]/record-payment/page.tsx'`.

## Known boundaries
- The guide highlights the **first visible eligible invoice**. Users can filter/page to place the desired invoice in the visible list; it does not automatically choose a different invoice or change filters.
- No tour auto-opens menus or auto-submits a payment. If the highlighted row disappears due to filtering or data updates, the tour asks the user to adjust the list.
- A resumed session is only UI navigation context, never an authorization mechanism; server Help permissions are checked again on each supported route.
