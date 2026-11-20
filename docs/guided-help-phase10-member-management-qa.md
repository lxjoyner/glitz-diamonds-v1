# Phase 10 — Member Management Guided Help QA

## Scope
Five **administrator-only** tours with Help enabled:
1. **Explore Registered Members** on `/admin/membership`: directory, sortable columns, first record Edit profile and Delete member safety, pagination.
2. **Review and Edit Member Profile** from Membership: click first member Edit profile, continue to `/admin/membership/{id}/edit`.
3. **Review and Edit Member Profile** direct on the edit page: username/role/status, identity, address, clothing sizes, preferences, Save changes.
4. **Create and Track Member Invitations** on `/admin/member-invites`: name, phone/email, Create Invite Link, sent history, Refresh.
5. **Understand Roles Manager** on `/admin/roles-manager`: Admin Access/View All, secretary/treasure/member permission settings, Save Role Settings.

Help Center entry points are visible only for the relevant administrator topics (Manage Registered Users, Send Member Invitations, Manage User Roles).

## Critical safeguards
- Guides **never click** buttons, submit forms, send invitation emails, generate a private registration link, edit/delete member records, or save role settings. A cross-page tour advances only after the administrator clicks the actual Edit profile link.
- Delete member is destructive and not a guided action. Do **not** test the Delete member button.
- The Member Profile form edits registration information, not assigned roles. Roles Manager changes **role permission settings**, not a specific person's assigned role; the configured role key is `treasure` in current source.
- Invite creation can generate a real private link and send an email. Do **not** submit Create Invite Link during the walkthrough.
- Invitation email opens are best-effort and may be triggered or blocked by providers.
- Directory and invite history show personal information. Use authorized test data and do not share private links or member details unnecessarily.
- Existing authentication, admin-only server access, Help-enabled gating, APIs, DB, and data mutations are untouched.

## Local acceptance tests
1. `git fetch origin`; `git switch feature/guided-help-member-management-phase10`; `npm run build`; `npm run dev`.
2. Sign in as Admin with Help enabled. Start **Explore Registered Members** on `/admin/membership`. Check directory table, sortable Name, first profile link, Delete safety, and paging. If no member, Edit and Delete highlights are legitimately unavailable.
3. Start **Review and Edit Member Profile** from directory. Click only the highlighted **Edit profile** link. Confirm cross-page continuation on the correct member and that edit form values load before highlights. Finish without Save.
4. Run the direct edit-page tour with `/admin/membership/{id}/edit?tour=members-edit-on-page`. Check identity, address, clothing sizes, preferences, role/status information, Save. No mutation.
5. On `/admin/member-invites`, start **Create and Track Member Invitations**. Check First/Last name, phone/email, Create Invite Link button, history table, refresh button. Do not create an invite. Check empty history, status sorting and paging.
6. On `/admin/roles-manager`, start **Understand Roles Manager**. Check Admin Role, secretary/treasure/member permissions, and Save Role Settings. Do not change checkboxes or save during tour.
7. From Help Center, test each Member/Invite/Role link and direct-start route. Test Back, Next, Finish, Escape, and browser refresh behavior.
8. Verify Treasurer, Secretary, Member, and signed-out accounts cannot access the new tours, and Help-disabled prevents the tours even for Admin.
9. Regression-test Phases 1–9 including vendor, transaction, report, invoicing and Dashboard tours. Confirm no POST/PATCH/DELETE or outbound invite emails occur from advancing guides.
10. Run local build/lint/tests with project's established quality gate. Record any preexisting failures.

## Limitations
Tours only guide existing UI. They do not add search/filtering to Membership, change individual role assignments, or add invitation resend functionality. Sorting and pagination may require existing records.
