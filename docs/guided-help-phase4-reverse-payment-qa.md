# Phase 4 — Reverse Incorrect Invoice Payment walkthrough

## Scope
- Admin-only tour to explain reversing a recorded invoice payment.
- Start from Invoice Dashboard **Show Me How > Reverse an Incorrect Invoice Payment**, or the Invoice Help Center.
- Dashboard tour first highlights the **Paid** tab and waits for the user to click it, then highlights the first **visible invoice with a paid amount**, its Actions menu, then **Reverse incorrect payment**. The selected invoice may have historical imported paid amounts with **no individually recorded payments**; if so, return and select an invoice with an actual recorded payment.
- Follow across the route to `/admin/invoices/{id}/reverse-payment`.
- Start an on-page version using **Show Me How** while on that reversal screen.
- Highlight invoice summary, recorded payments, reason for reversal, accounting warning, and the confirmation control.
- No new dependencies, database migrations, API changes, or changes to reversal behavior.

## Safety
- Only Admin may see or launch this tour. Treasurer, Secretary, and Member must not.
- Existing Help enablement and current role verification must remain in effect across navigation.
- The tour never selects a payment, fills the reason, triggers a confirmation dialog, executes a POST, refunds funds, or changes any accounting balance.
- A user must manually select the actual erroneous payment, supply a reason of **at least 10 characters**, click **Confirm payment reversal** and separately confirm the browser dialog. This changes accounting records: only use designated test data for any execution test.
- Reversal does NOT issue a refund and does NOT retract already sent customer emails.

## Local QA
1. `git fetch origin`; `git switch feature/guided-help-reverse-payment-phase4`; `npm run build`; `npm run dev`.
2. Sign in as Admin with Help enabled. From Invoice Dashboard open **Show Me How > Reverse an Incorrect Invoice Payment**.
3. On opening the reversal tour, verify **Paid** (not Unpaid) is highlighted. Click the Paid tab and confirm the tour advances only after that click. For a partially paid invoice, switch to **All invoices** afterward. Confirm the highlighted Actions belongs to the correct invoice, then click Actions > **Reverse incorrect payment**.
4. Verify the walkthrough resumes on the correct invoice's reversal screen; review summary, recorded payments, reason, warning, and the confirm control.
5. Use **Back**, **Next**, **Exit**, **Escape**, browser zoom, scrolling, and phone-size viewport. Complete **Finish guide**; verify no accounting records change.
6. On the reversal screen itself, start **Show Me How > Reverse an Incorrect Invoice Payment**. Confirm the guide works without dashboard navigation.
7. Check Help Center invoice topic shortcut is shown only for Admin.
8. Re-test with Treasurer, Secretary, Member, Help disabled, and signed-out states: no unauthorized tour, no reversal permission bypass.
9. Check empty recorded payments and imported historical payment cases. The tour should explain missing controls; no attempt to reverse historical amounts.
10. On **safe test data only**, separately verify existing reversal API behavior, minimum reason length, confirmation dialog, audit history, and corrected balances.
11. Regression test **Record an Invoice Payment**, **Create a New Invoice**, and **Dashboard** sidebar navigation/login.
12. Focused ESLint if applicable; note known pre-existing repository-wide lint failures separately.

## Limitations
- The Dashboard only knows whether an invoice has a paid amount. It cannot infer whether the paid amount is from reversible individual payments before opening the reversal screen.
- This is a UI teaching tool, not an accounting operation.
