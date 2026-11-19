# Phase 6 — Record a Vendor Bill Payment (Guided Help)

## Scope
- New **Record a Vendor Bill Payment** tour on `/admin/vendors/bills` for Admin and Treasurer roles only.
- Launch from **Show Me How** on Bills or Help Center > **Review Vendor Bills**.
- Highlight vendor/date filters, the **first visible unpaid or partially paid bill**'s Record a payment button, then the existing payment modal's method, amount, date, account, optional memo, and Save.
- The guide waits for a real click on Record a payment to open the modal; it never automatically records a payment.
- Existing Help Enabled and role checks are reused.

## Financial safety
- The modal records a **payment already made**; it does not actually send money to a vendor.
- The guide never enters fields, chooses an account, posts to a payment API, or clicks Save.
- Finishing the guide never records a payment; an authorized person must manually choose Save after verifying the vendor, bill, amount and account.
- No changes to business logic, database, payments API, permissions, dependencies or Hostinger configuration.

## Local QA
1. Run `git fetch origin`, `git switch feature/guided-help-vendor-bill-payments-phase6`, `npm run build`, `npm run dev`.
2. Sign in as Admin with Help enabled and visit `/admin/vendors/bills`.
3. Choose **Show Me How > Record a Vendor Bill Payment**. Filter to a bill with remaining balance; check highlighted Record a payment belongs to the correct bill.
4. Click the highlighted Record a payment. Confirm the dialog opens and the walkthrough moves to Payment method only after the real click.
5. Walk through Payment method, Amount, Date, Account, Memo and Save. Verify every highlighted control is correct, especially with partial payments and zero-balance bills in the list.
6. Click **Finish guide**, not Save; verify no payment was recorded, no balances changed, and no API POST occurred.
7. Close the modal manually, test Escape/Exit, Back/Next, slow bill API, no eligible bills, filtering, paging, mobile and browser zoom.
8. Use Help Center > Review Vendor Bills > **Show Me How: Record Vendor Bill Payment**.
9. Confirm Admin and Treasurer are allowed. Check Member, Secretary, logged-out and Help-disabled states cannot launch.
10. Regression-test Invoice Dashboard, Record Invoice Payment, Create Invoice, Reverse Invoice Payment, Phase 5 recurring tours, and sidebar Dashboard login navigation.
11. If testing a real accounting post, do so separately using a designated test bill and explicitly approved test payment; check resulting bill balance and ledger.

## Integration note
- PR #239 is still open on GitHub even though Phase 5 was reported working in production. Phase 6 is intentionally branched **from Phase 5**, and its PR targets `feature/guided-help-recurring-invoices-phase5` until Phase 5 changes are integrated into `master` or the divergence is reconciled. Do not merge Phase 6 into production out of order.
