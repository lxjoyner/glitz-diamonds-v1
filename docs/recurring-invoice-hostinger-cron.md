# Automatic recurring invoice delivery on Hostinger

The existing secured scheduler endpoint does not run by itself. Hostinger must call it on a recurring basis, even if a recurring invoice is active.

## Required Hostinger setup

1. Set the Node app environment variable RECURRING_INVOICE_CRON_SECRET to a newly generated secret. Redeploy/restart the app.
2. In Hostinger Cron Jobs, configure an hourly task at minute 05 (cron expression: 5 * * * *).
3. The cron job must run curl over HTTPS with the Authorization header Bearer <secret>, targeting https://www.glitzofdiamonds.com/api/cron/recurring-invoices . Example command:

    curl --fail --silent --show-error --max-time 240 -H "Authorization: Bearer $RECURRING_INVOICE_CRON_SECRET" "https://www.glitzofdiamonds.com/api/cron/recurring-invoices"

IMPORTANT: The Hostinger Cron Job shell may not inherit Node app environment variables. Configure the secret privately in the cron environment as well (or a private config owned by the hosting account). Never commit the secret to GitHub, publish it, or expose it in a URL.
4. Visit the admin Recurring Invoices > Scheduler status panel. Check Cron secret configured, due invoice count and recent run history.
5. Test on a dedicated test member by creating an active schedule with Next Invoice set to today. Press Run due invoices now. This creates AND EMAILS a REAL invoice, advances the schedule, and provides a per-run result. The Test Send button is separate and never advances the recurring schedule.

## Recovering missing or failed runs

- The scheduler uses the America/Chicago date and processes all active schedules with next_invoice_date today or earlier.
- Each invocation processes at most one scheduled cycle per recurring schedule to prevent bursts. Subsequent hourly invocations catch up older schedules.
- Failed or stale (30+ minutes) runs may be retried after the cause is fixed. Their original linked invoice is reused to avoid creating duplicate invoices.
- Active schedules without member email fail visibly instead of silently advancing.
- The scheduler keeps the existing unique recurring schedule/date database key to guard duplicate runs.
- If SMTP accepts an email but the server crashes before recording success, a rare duplicate email may still occur on retry. Compare mail logs and invoice status if this happens.
- Cron uptime, app uptime, and SMTP availability affect delivery timing; an hourly cron runs within the first hour of the requested date, not at an exact minute.

NOTE: Creating this PR does not configure Hostinger's cron job or environment variables. Both settings must be applied in the hosting dashboard for fully automatic unattended delivery.
