# Phase 8 — Vendor Management Guided Help QA

## Scope and tour entry points
Help Center > **Manage Vendors** exposes:
- **Explore Vendor Directory** (`vendor-directory`) — vendor list, available actions and bill links.
- **Add Vendor** (`vendor-create`) — directory → Add a vendor → vendor form.
- **Edit Vendor** (`vendor-edit`) — first vendor Actions → Edit → existing vendor form.
- **Create Vendor Bill** (`vendor-create-bill`) — first vendor Create bill → bill form.

The forms also have direct-start **Show Me How** entries: `vendor-create-on-page`, `vendor-edit-on-page`, `vendor-create-bill-on-page`.

Help Center > **Review Vendor Bills** adds **Review Vendor Bill Status** (`vendor-bills-review`) covering vendor/date filters, bill status and amounts, and pagination.

## Behavior and safeguards
- All tours require authenticated Admin or Treasurer access and Help enabled.
- Tour progression does **not** submit forms, create or edit vendors, create bills, delete vendor records, record payments, or trigger exports.
- Existing Save and Delete actions are unchanged. Tours must finish before intentional manual saving. Selecting a vendor's Delete action is **not** part of these guides.
- Vendor form currently supports USD currency and two types: Regular and 1099-NEC contractor. Selecting 1099-NEC does not file tax forms.
- The Vendor Bills list shows bill status and totals. It does **not** offer an itemized per-vendor payment-history ledger; no such feature is claimed or created.
- The vendor directory's Import from... control has no action in the current UI; tours do not claim an import feature works.
- No server API logic, database schema, financial calculations, payment persistence, new dependencies, or Hostinger settings have changed.

## Local test procedure
1. `git fetch origin`; `git switch feature/guided-help-vendor-management-phase8`; `npm run build`; `npm run dev`.
2. Sign in as Admin with Help enabled, open `/admin/vendors`, run **Explore Vendor Directory**. Verify the list, Add, first vendor Actions and Create bill highlights.
3. Run **Add a Vendor** from the vendor list; click the highlighted Add a vendor link. Verify the tour continues on `/admin/vendors/new`. Check Vendor Name, Type, optional contact details, currency, notes and Save. Finish **without saving**.
4. Start **Add a Vendor** directly from Show Me How on the form. Test Back, Next, Exit, Escape and reload.
5. Return to directory. Run **Edit an Existing Vendor**. Click Actions on the first vendor, then Edit. Verify the guide continues on the correct vendor edit form and loads existing values. Finish without saving.
6. Also test direct Show Me How from `/admin/vendors/{id}/edit`.
7. Run **Create a Vendor Bill** from the directory. Click the first vendor's Create bill link and verify cross-page continuation. Check vendor, bill date, due date, references, notes, line items, totals, and Save. Finish without saving.
8. Also test direct Show Me How from `/admin/vendors/{id}/create-bill`. Confirm no bill is created by advancing the guide.
9. Open `/admin/vendors/bills`, run **Review Vendor Bill Status**. Confirm vendor/date filters, statuses and amount-due table, pagination (when results exist). Confirm guide does not record payment.
10. Verify Help Center links for vendor directory, create, edit, create bill and bill status.
11. Test empty vendor directory, 0 bills, slow data load, narrow viewport, scrolling, browser zoom and denied permissions.
12. Verify Treasurer access, and denied access for Member, Secretary, logged-out users and Help-disabled sessions.
13. Regression: Phase 1–7 guides, especially Phase 6 Record Vendor Bill Payment, invoice flows, financial reports, and Dashboard navigation.
14. Confirm all tour steps issue no POST/PATCH/DELETE calls and no save or delete actions. Only manually authorized actions may mutate records.

## Expected limitation
When the vendor directory is empty, edit and create-bill tours have no eligible first vendor. The walkthrough displays a missing-target notice rather than creating a dummy vendor. On an empty Bills list, pagination will not appear.
