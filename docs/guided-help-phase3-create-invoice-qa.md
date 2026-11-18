# Phase 3 — Create a New Invoice guided walkthrough

## What changed
- Add a guided walkthrough **Create a New Invoice**, available to authorized Admin and Treasurer users.
- Launch from **Show Me How** on the Invoice Dashboard: the guide highlights **Create an invoice**, waits for a real user click, and resumes on the new invoice page.
- Alternatively launch directly from **Show Me How** on `/admin/invoices/new`, or from the **Create a New Invoice** Help Center topic.
- Highlight **Bill to**, optional reference, invoice date, payment due date, first line item description/quantity/price, add item, notes, terms, totals, and save/approve actions.
- Preserve all previous invoice payment and dashboard tours.
- Use existing Help enablement and role checks. No dependencies, migrations, changes to invoice persistence, or automatic actions.

## Financial safety
- Guided Help never chooses a member, enters form values, clicks Save and continue, clicks Approve Draft, or calls invoice APIs.
- The guide ends **before** user-triggered invoice creation or approval.
- **Save and continue** and **Approve Draft** remain operational and must be tested separately with approved test records.

## Local QA
1. From the Git repository root, run `git fetch origin`, `git switch feature/guided-help-create-invoice-phase3`, `npm run build`, then `npm run dev`.
2. Admin with Help enabled: open `/admin/invoices`; start **Show Me How > Create a New Invoice**. Click highlighted **Create an invoice**; confirm the guide resumes on `/admin/invoices/new` at **Bill to**.
3. On `/admin/invoices/new`, start the guide directly from **Show Me How > Create a New Invoice**. Confirm every spotlight matches the form control, including custom InvoiceDatePicker wrappers.
4. Use **Back**, **Next**, **Exit**, **Escape**, browser scrolling, narrow viewport, and 200% zoom. Verify the tour does not change form values.
5. Click **Finish guide**. Confirm no invoice was saved and no approval happened.
6. Use Help Center > **Create a New Invoice** > **Show Me How: Create Invoice** and confirm the guide starts on the form.
7. Repeat as Treasurer. Confirm Secretary and Member cannot see the tour. Disable Help globally and confirm guides are hidden for all roles, including if a saved tour was pending.
8. With safe test data, separately verify Save and continue creates a draft and Approve Draft approves correctly. Avoid creating a real production invoice during tour-only testing.
9. Re-test **Explore the Invoice Dashboard** and **Record an Invoice Payment** to detect regressions.
10. Run a focused ESLint check for touched files. Existing repository-wide warnings may be unrelated.

## Known limitations
- This tour explains how to add multiple line items but highlights only the **first** line item for description, quantity, and price.
- The tour uses manually controlled Next/Back for form input steps; it does not gate progression on a filled field. The app's existing validation remains authoritative.
- Cross-page continuation is based on sessionStorage tour ID/step, never member or invoice data.
