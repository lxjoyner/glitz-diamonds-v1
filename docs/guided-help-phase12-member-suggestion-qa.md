# Phase 12 — Member Activity Suggestion Guided Help: Local QA

## Scope
A dedicated **15-step**, member-only tour called **Submit an Activity Suggestion — Step by Step** on `/admin/ideas-activities` with Help topic `ideas`. Existing Phase 11 **Explore Community Ideas and Voting** stays available unchanged.

The tour highlights these existing controls in order:
1. Activity title (required)
2. Description/details (required)
3. Category
4. Purpose
5. Location type
6. Location
7. Expected cost range
8. Time commitment
9. Number of participants (1–500)
10. Preferred Date From
11. Preferred Date To
12. Optional image or PDF
13. Live Preview Card
14. Submit
15. Save As Draft

## Safety and accuracy
- `Submit` POSTs a **submitted** idea for voting; `Save As Draft` POSTs a **draft** idea. Neither button is clicked by the guide; the member must choose independently *after* finishing. This includes avoiding unintended creation of records during testing.
- The existing API requires nonempty title, details, category, purpose, location type, location, budget range, time commitment and preferred dates; group size must be 1–500. The form's placeholder selections are not a meaningful answer even though server-side validation treats their text as nonempty. Review the entries.
- Attachment selection alone remains client-side until a separate Submit or Save As Draft action; no guide step sends or uploads a file.
- The guide does not schedule an event or create a poll. Community voting, events, and administrative functions are separate.
- A tour can be launched from the Ideas & Activities **Show Me How** button or Help Center > Ideas & Activities > **Show Me How: Submit an Activity Suggestion**.
- Tour `roles: ["member"]`, the original Help topic visibility, authentication, and Help-enabled checks apply.
- Only existing `data-tour` anchors, tour instructions, Help Center link, and a provider safety notice changed. No API, DB, permissions or form behavior changes.

## Local QA procedure
1. `git fetch origin`
2. `git switch feature/guided-help-member-suggestion-steps-phase12`
3. `npm run build`, then `npm run dev`
4. Sign in as a regular **Member**, with Help System enabled.
5. Navigate to `http://localhost:3000/admin/ideas-activities`. Click **Show Me How** > **Submit an Activity Suggestion — Step by Step**. Walk through all 15 anchors; verify Next/Back, scrolling, and tooltips identify the correct input.
6. Type *test values without submitting* in each field to confirm highlighting does not clear input or advance unexpectedly. Verify previews reflect the title and details. Do **not** click Submit or Save As Draft while testing the walkthrough.
7. Verify the two action buttons each have their own separate steps, and the final warning says nothing is saved automatically.
8. From `/help` launch the direct link; verify the guide starts at Step 1, the existing **Ideas & Activities Overview** entry remains, and both guides can be selected on the page.
9. Confirm non-member roles (Admin, Secretary, Treasurer), signed-out users, and Help-disabled users cannot start this new member-only tour, including via direct `?tour=member-suggestion-step-by-step`.
10. Regression test Phase 11 My Profile/Dashboard/Calendar, earlier Guided Help phases, and the untouched Ideas & Activities form submission behavior separately with suitable test data.
11. Watch browser Network while advancing: guide navigation should generate **no POST/PATCH/DELETE requests**, uploads, emails, or real activity records.

## Limitations
The walkthrough teaches form input; it does not validate or autofill the form, submit a suggestion, create a draft, schedule an activity or initiate polling. Run a separate end-to-end submission test only if test data creation is intended.
