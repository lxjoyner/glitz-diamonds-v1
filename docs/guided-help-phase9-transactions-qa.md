# Phase 9 — Transactions Guided Help QA

## Scope
Admin/Treasurer users with Help enabled:
- `transactions-overview` on `/admin/transactions`: the displayed filtered net amount; Filter (All, Income, Expense), Sort, Search, transaction table, row selection and Actions menu.
- `transactions-edit` from directory: first visible non-donation transaction Actions → Edit more details → edit form.
- `transactions-edit-on-page` directly on `/admin/transactions/{key}/edit`: Date, Description, Account, Type, Amount, Category, linked Contact, Notes, Receipt upload and Save.

Help Center > **Review Transactions** exposes launch links for the overview and editing tour.

## Important constraints
- Tours highlight and describe existing controls only; never save, delete, upload receipts, modify financial records, or execute API mutations.
- The top-level Add transaction and More buttons, reconciliation display, Split transaction, Mark as reviewed, and bulk toolbar icons do not implement their advertised actions in current source. The tour does not instruct users to use them.
- All accounts displays the filtered sum of income less expenses, **not a verified or reconciled bank balance**.
- Clicking a receipt-upload control or dropping a file is a real upload; do not perform this action during guide testing.
- Donation rows link to Donations, not the transaction edit form. The Edit tour targets the first visible non-donation row. No eligible rows means the target is absent, and the tour should not edit anything.
- Imported invoice-history payments are read-only; imported bill-history entries require verification of the date, amount, and account before an edit can be saved. Real changes belong outside the tour.
- Existing API, financial logic and permissions are unmodified. No database migration or new dependency.

## Local QA
1. `git fetch origin`; `git switch feature/guided-help-transactions-phase9`; `npm run build`; `npm run dev`.
2. Sign in as Admin with Help enabled; open `/admin/transactions`.
3. Start **Explore Transactions**. Verify the summary, income/expense filter, date sort, search, transaction table, select all and first row Actions highlights. Verify the tour itself never clicks a control or changes filters.
4. Start **Review and Edit a Transaction**. If a non-donation row exists, click the highlighted eligible row's Actions menu then **Edit more details**. Confirm guide continues on `/admin/transactions/{key}/edit` with loaded values.
5. Check Date, Description, Account, Deposit/Withdrawal, Amount, Category, customer/vendor contact, Notes, Receipt, Save highlights and text; **do not save or upload**.
6. Start direct form guide via `?tour=transactions-edit-on-page`; verify resumption, Next/Back/Finish/Exit and refreshed page behavior.
7. Test empty transactions list, filtered list with donations only, disabled Save on invoice-history records and bill-history date verification.
8. Test Help Center transaction links, role gating for Admin/Treasurer vs Member/Secretary, signed-out session and Help-disabled state.
9. Regression-test Phase 1–8 tours (including vendor creation and bill payment), Dashboard navigation, and report pages.
10. Confirm no POST/PATCH/DELETE requests result solely from advancing or ending a tour. The existing record actions are unchanged.

## Notes
Only front-end `data-tour` anchors, tour definitions, existing Guided Help provider guidance and Help Center links are modified.
