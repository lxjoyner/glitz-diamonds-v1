# Invoice payment reversal: administrator QA and accounting checks

This enhancement is for correcting a **recorded payment applied to the wrong invoice**, not refunding money to a customer. Only Admin users may reverse an individual payment row; imported historical paid balances without payment rows are excluded.

## Atomic data changes

- Lock invoice, then lock selected invoice payment inside the same database transaction as the existing payment recorder.
- Copy full payment details, original ID, reversing admin username, timestamp, and required reason to `invoice_payment_reversals`.
- Delete the incorrect individual payment row from `invoice_payments`, decrement `invoices.amount_paid_cents`, and set status to `sent`, `partially_paid`, or `paid` as appropriate.
- Commit all changes together. A failure rolls back the audit insert, payment removal, and invoice update together.
- The reversal audit remains even after the original payment row is removed.
- Existing reports calculate from `invoices.amount_paid_cents` and `invoice_payments` and therefore reflect the updated balance when refreshed. Reports are not adjusted by editing report totals directly.

## Mandatory test cases before production

1. Back up staging MySQL. Ensure DB user can create the new `invoice_payment_reversals` table.
2. Create test invoice A = $100 and invoice B = $100. Record $100 accidentally against A.
3. From **Invoices → Paid → Actions → Reverse incorrect payment**, choose the exact payment and provide a reason.
4. After reversal: A shows $0 paid, $100 balance outstanding and Due/Past Due status as applicable; B remains unchanged.
5. Check Account Transactions accrual report: old payment credit disappears and receivable increases by $100. Cash and Cash Only reports should no longer show the receipt.
6. Check Income By Customer paid income and Balance Sheet cash/receivables (as-of-date). Verify they reflect removal of the selected payment.
7. Check general Transactions report: old invoice-payment transaction disappears; audit history remains on reversal page.
8. Test partial payments: $30 + $70 against $100 invoice; reverse $70 only. Expect $30 paid and $70 outstanding, status Partially Paid.
9. Test double submission and stale page: second reversal must fail without changing totals; verify payment cannot be reversed twice.
10. Verify Admin can reverse; Treasurer, Secretary, Member, anonymous all receive 403/401 for the reversal API.
11. Reopen invoice customer view and check updated outstanding amount. Existing emailed receipts are **not** recalled; notify customer separately when appropriate.
12. Test historical imported fully-paid invoice with no ledger rows: page should show no selectable payments, not create a fabricated reversal.
13. Confirm transactions and audit history survive a staging restart/redeploy.

## Production deployment precautions

- Never deploy without a recent database backup.
- Check outstanding/paid totals before and after a test reversal.
- Reversal does **not** physically refund money, change a bank transaction, or withdraw a previously sent email. If money actually cleared, handle refunds or reassignment as a separate audited financial action.
- Do not reverse a legitimate payment merely to make an invoice appear unpaid; verify the error against payment account records.
- Both zoom layout and payment reversal have separate PRs to allow independent testing.
