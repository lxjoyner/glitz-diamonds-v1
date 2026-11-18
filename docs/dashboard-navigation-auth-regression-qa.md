# Dashboard authentication redirect regression — targeted fix

## Reported production symptom
After Phase 3 deployment (PR #236), the sidebar **Dashboard** link sometimes opens the login screen even though the user has signed in.

## What was verified in source
- Sidebar Dashboard points to `/admin/messages`.
- Next.js `proxy.ts` checks for the `glitz_token` cookie on protected `/admin/*` requests; without it, proxy redirects to `/admin/login`.
- `/api/admin/me` verifies the token; JWT cookie is issued only after two-factor verification.
- PR #236 did not edit `Header.tsx`, `proxy.ts`, `/api/admin/me`, or authentication/session issuance.
- With Next.js App Router, a prefetched/cached redirect captured when a user was not yet authenticated is a plausible explanation for a protected route landing on login after authentication. This remains a hypothesis until live network data confirms it.

## Fix
Use a native `<a href="/admin/messages">` link for **Dashboard** instead of Next.js client `<Link>`. It forces a new document request carrying the browser's current cookies and avoids the client router's stale prefetch/navigation cache for this critical protected destination. It does **not** bypass proxy authorization, extend sessions, change cookies, or alter login.

## Verification checklist
1. `git fetch origin`; `git switch fix/dashboard-navigation-auth-redirect`; `npm run build`; `npm run dev`.
2. Sign out, sign in through the full 2FA process, then open the sidebar Dashboard. It must show `/admin/messages`, not `/admin/login`.
3. From Invoice Dashboard, New Invoice, Help Center, and Record Payment, select Dashboard again. Confirm navigation works.
4. Log out, then open `/admin/messages` directly. You **must** be redirected to login; the fix must not bypass auth.
5. Leave session idle until its intended 15-minute limit. Logout must still work and redirect as designed.
6. Test the app on the same canonical host (`www.glitzofdiamonds.com`) for login and navigation.
7. If redirect still occurs, inspect the browser Network tab for the document GET `/admin/messages`: a 307/308 to login means the server did not receive the expected cookie. Compare the hostnames between login and dashboard requests, and check for expected `glitz_token` cookie existence in browser DevTools (do not copy or share its value). Check that `/api/admin/me` reports `authenticated:true` on the same host.

## Scope
No dependency, database, guided tour, or authentication backend changes. The root cause is not yet confirmed; the fix addresses stale client routing with a conservative full-page navigation.
