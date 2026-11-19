# Phase 7 — Financial Reports Guided Help QA

## Scope
Three **read-only** walkthroughs available to Admin and Treasurer roles with Help enabled:

1. **Income by Customer** at `/admin/reports/income-by-customer`: date range, From, To, Update Report, customer income totals / detail drilldown, and Export (CSV/PDF).
2. **Account Transactions** at `/admin/reports/account-transactions`: reporting period, report basis (Accrual/Cash Basis/Cash Only), Contact, Update Report, dated ledger rows, and print/export.
3. **Balance Sheet** at `/admin/reports/balance-sheet`: as-of year and date, report type, Update Report, headline values, Summary/Details, data caveats, and CSV/PDF export.

Each report page exposes **Show Me How**. Help Center > **View Financial Reports** has three direct-start links.

## Safeguards
- Tours only explain/highlight existing user-interface controls. They never trigger server calls, edit financial records, change report filters, download data, print, or navigate away on the user's behalf.
- Existing server-backed Help enablement, authentication, and Admin/Treasurer role checks remain in effect.
- **Balance Sheet is a report of recorded application data. Its calculated Cash and Bank figure is not a reconciled bank balance.**
- Exports remain manual. Income export may be disabled on an empty report.
- No database migrations, new dependencies, API changes, or financial calculation changes.

## Acceptance tests
1. In IntelliJ: `git fetch origin`; `git switch feature/guided-help-financial-reports-phase7`; `npm run build`; `npm run dev`.
2. Login as Admin with Help enabled. Navigate to `/admin/reports/income-by-customer`. Start **Show Me How > Explore Income by Customer**; check each highlight and text, especially From/To, Update Report, customer table, Export.
3. Change date range manually and click Update Report separately; verify tour does not trigger data fetching by itself. Check empty-results state and disabled Export.
4. On `/admin/reports/account-transactions`, start **Explore Account Transactions**. Verify report-basis choices, contact filter, period, update control, ledger table, and Export button. Confirm the existing Export button invokes the browser print flow if clicked manually, not a CSV export.
5. On `/admin/reports/balance-sheet`, start **Explore the Balance Sheet**. Verify as-of year/date, Accrual/Cash report basis, update, totals, Summary/Details, Report data notes, Export. Check Cash and Bank non-reconciliation caveat.
6. From Help Center > **View Financial Reports**, test all three direct-start links with `?tour=...`, including a hard refresh and browser back.
7. Test Back, Next, Finish, Exit, Escape, scrolling, mobile viewport, and browser zoom on all report tours.
8. With Treasurer confirm access. With Secretary, Member, signed-out, and Help-disabled states verify no unauthorized walkthroughs are offered or resumed.
9. Regression-test Phase 1–6 tours (invoice dashboard, create, record, reverse, recurring, vendor bill payment) and Dashboard sidebar login navigation.
10. Confirm no financial record changes, POST/PUT/DELETE API calls, or downloads from advancing/finishing the walkthroughs.
11. Run repository tests/lint according to existing project quality gate; note any pre-existing failures.

## Notes
The report pages and existing financial calculations are not modified beyond adding `data-tour` anchors. These tours teach existing UI behavior and do not assert that displayed figures are independently audited.
