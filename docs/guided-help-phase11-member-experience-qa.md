# Phase 11 — Member-facing Guided Help QA

## Purpose and member-only scope
Guided Help for signed-in users whose role is `member`, using only existing member-accessible screens and already published Help topic IDs:
- `member-dashboard-overview` — `/admin/messages`, Help topic `dashboard`: signed-in dashboard and account menu
- `member-profile-guide` — `/profile`, Help topic `profile`: identity, contact details, sizes, personal details, Save
- `member-ideas-overview` — `/admin/ideas-activities`, Help topic `ideas`: activity form, draft/submit controls, list/voting, scheduled activities
- `member-calendar-overview` — `/calendar`, Help topic `calendar`: event introduction, month navigation, day grid

The Help Center displays matching launch links **only when the current role equals `member`**. Each tour is restricted to `roles: ["member"]` and requires the existing Help-enabled, authenticated, visible-topic checks. Do not expose invoice, vendor, financial, registered-user, invitation, administrative settings or roles management tours to members.

## Existing UI constraints discovered in source
- `Header.tsx` exposes My Profile, Dashboard, Help Center (when enabled), Ideas & Activities and Calendar to signed-in members; finance and administrative management links are role restricted.
- `app/admin/messages/page.tsx` shows members the Role Dashboard header, account menu and Logout. Administrative settings, member management, gallery editing and contact messages are role gated.
- `app/profile/page.tsx` lets members edit personal information, but the role input is disabled; Save profile is a real write.
- `app/admin/ideas-activities/page.tsx` provides activity proposals and a shared idea/voting list. Clicking Submit or Save As Draft is a real write, as are Upvote/Favorite interactions. Administrator-only Add to Calendar, Remove Idea, Remove Poll and Remove from Calendar are not part of member tours.
- `app/calendar/page.tsx` shows scheduled events and active birthdays. Drag-to-move is restricted to admin/secretary; members browse months and view dates.

The `Roles Manager` contains optional visibility settings; those settings do **not** grant tour permissions and are not modified. If a member's navigation or access is further restricted by site settings, only tour routes actually available to that member should be presented. Help enablement and signed-in roles are revalidated on each tour route.

## Testing
1. `git fetch origin`; `git switch feature/guided-help-member-experience-phase11`; `npm run build`; `npm run dev`.
2. Sign in with a **regular member test account** (not Admin/Treasurer/Secretary) and ensure Help System is enabled.
3. Open Help Center. Confirm four launch links appear inside Dashboard, Update My Profile, Ideas & Activities and Calendar. Confirm no administrative or financial Help topics are displayed.
4. Open `/admin/messages?tour=member-dashboard-overview`. Verify signed-in member heading and account menu highlight; there is no mention of admin-only controls as usable.
5. Open `/profile?tour=member-profile-guide`. Check all five steps; Role is read-only; **do not click Save profile** while testing the tour.
6. Open `/admin/ideas-activities?tour=member-ideas-overview`. Check suggestion, Submit/Draft, ideas list and scheduled events. Test with 0 ideas and with data. **Do not submit ideas, vote, or generate polls** as part of the walkthrough.
7. Open `/calendar?tour=member-calendar-overview`. Confirm calendar introduction, Previous/Next, and date grid. Verify member events cannot be dragged to another date.
8. Test Back, Next, Finish, Exit, Escape, refresh, narrow viewport, and slow network loading. Ensure highlighting does not click anything.
9. Verify tours do not appear for Admin/Treasurer/Secretary, logged-out accounts, or disabled Help. Verify direct `?tour=` links cannot bypass role checks.
10. Regression test Phase 1–10 walkthroughs and existing Member navigation. Confirm progressing through tours causes no PATCH/POST/DELETE, save, upload, vote, email, or other mutation.

## Out of scope
No change to role assignments, route permissions, Role Manager flags, database, API, member activities, profile saves, or calendar data. No new member-only page is created. Guides describe current member-visible UI, not hypothetical features.
