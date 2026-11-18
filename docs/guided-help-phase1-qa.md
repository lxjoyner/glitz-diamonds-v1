# Guided Help — Phase 1 Foundation

## Included
- Reusable role-aware tour registry (`lib/guided-tours.ts`) with stable `data-tour` selectors.
- Global `GuidedHelpProvider` mounted in the application layout; contextual **Show Me How** launcher on eligible pages.
- Floating in-place spotlight on real controls, scroll-into-view, resize/scroll repositioning, progress, Back/Next/Finish, Escape/Exit.
- Guided Help checks `/api/help/topics` (authenticated, role-filtered, and disabled when the admin Help switch is off) before making the launcher available.
- Help Center entry **Start Interactive Guide** for the Invoice Dashboard.
- One read-only starter walkthrough: invoice status tabs and Actions column.
- No npm dependency, lockfile, schema, payment, or invoice-processing changes.

## Scope / phase boundary
The starter tour illustrates the foundation only. The **Record payment** menu selection and cross-page payment form steps are Phase 2, and are **not implemented** in this PR. No walkthrough performs financial actions.

## Test on local branch
1. `npm run build`; run `npx eslint components/GuidedHelpProvider.tsx lib/guided-tours.ts app/help/page.tsx` to check touched code. Known unrelated repository-wide lint errors may remain.
2. Log in as **Admin**, enable global Help in dashboard. Open `/admin/invoices`. Verify **Show Me How** appears near bottom right.
3. Select **Explore the Invoice Dashboard**; verify Unpaid tab and Actions column are highlighted in sequence. Try Back, Next, Finish, Escape, scrolling, 200% zoom, and narrow window.
4. Open Help Center, find **View the Invoice Dashboard**, click **Start Interactive Guide**. Verify route navigation starts the tour.
5. Log in as **Treasurer**. Verify same authorized tour.
6. Log in as **Secretary** and **Member**; verify no invoice tour available.
7. Turn global Help **off**; verify launcher hidden and Help Center not offering the tour. Check logged-out behavior too.
8. Check that opening/exiting any tour never sends a payment request or changes invoice state.

## Future Phase 2
Provide robust stable anchors for the invoice's individual Actions dropdown and Record payment link; persist tour across navigation and handle form steps. Add a deliberate manual-submit safety checkpoint. Do not auto-submit any payment.
