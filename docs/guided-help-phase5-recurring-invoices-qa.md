# Phase 5 — Recurring Invoices Guided Help QA

## Scope

This phase adds three tours to the existing role-aware Guided Help provider:
- **Create a Recurring Invoice**: From the recurring schedule list, select Create a recurring invoice, then review customer, reference, payment terms, Active/Draft, repeat day, first invoice date, line-item description/quantity/price, notes, total, and save action.
- **Manage Existing Recurring Invoices**: Review tabs, open the first visible schedule's Actions menu, and learn the difference between View, Edit, End, Duplicate, and Delete permanently.
- **Understand Recurring Invoice Scheduling**: Open Scheduler status, inspect the scheduler summary, learn the manual Run due invoices now option, and inspect history.

Tour entry points: `/admin/invoices/recurring` Show Me How, `/admin/invoices/recurring/new` Show Me How, and the Help Center's **Manage Recurring Invoices** topic.

## Financial safety and security

- Tours never select customers, change fields, create or activate recurring schedules, edit/end/delete schedules, trigger cron jobs, run the manual scheduler, generate invoices, or send email.
- The live **Run due invoices now** button is highlighted for explanation only; pressing it outside the tour can create and email real invoices.
- **Active** means a due schedule is eligible for automation; **Draft** is not processed by scheduler.
- The existing scheduler panel says Hostinger cron calls the protected endpoint at five minutes past each hour. A configured cron secret does **not** confirm that Hostinger has set up the external schedule.
- Existing Help-enabled and Admin/Treasurer access checks are reused. Secretary, Member and logged-out users must not access the tours.
- No changes to invoice scheduler APIs, recurrence logic, database, authentication, or cron settings.

## Local test plan

1. `git fetch origin`; `git switch feature/guided-help-recurring-invoices-phase5`; `npm run build`; `npm run dev`.
2. Sign in as Admin with Help enabled and open `/admin/invoices/recurring`.
3. Start **Create a Recurring Invoice**. Confirm the Create button highlights and only actual click advances. Confirm form opens and the same guide continues on `/admin/invoices/recurring/new`.
4. On the new form start **Show Me How > Create a Recurring Invoice** directly. Verify all form spotlights, Back/Next, mobile/zoom, Escape and Finish guide. No schedule should be saved.
5. Verify customer selector's initially collapsed state and the dynamic Bill to section both highlight. Verify first invoice date picker highlights.
6. Return to schedule list and start **Manage Existing Recurring Invoices**. Verify filter tabs, first displayed row Actions, and menu items. If no rows exist, the guide should explain that the control is unavailable; no changes should occur.
7. Start **Understand Recurring Invoice Scheduling** with the Scheduler status panel initially **closed**. Click Scheduler status and check the tour advances to the overview, real-run control, and history. Do **not** click Run due invoices now.
8. If scheduler status was already open, close it before launching the walkthrough.
9. Open Help Center > Manage Recurring Invoices and verify all three launch links.
10. Verify Admin and Treasurer can use tours; Member, Secretary, disabled Help, and logged-out sessions cannot.
11. Check existing **Invoice Dashboard**, **Record Payment**, **Create Invoice**, **Reverse Payment** and Dashboard sidebar login/navigation regressions.
12. If testing any actual schedule save or cron processing, use explicitly authorized test data, and do it separately from a walkthrough.

## Known boundaries

- Manage Existing Recurring Invoices anchors the **first visible schedule**. Change filters/pages to locate a different schedule.
- The tour teaches the manual scheduler action but never executes it.
- The recurrence form has multiple line items but stores a consolidated recurring amount. The guided steps highlight the first line item.
