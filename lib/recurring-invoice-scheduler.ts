import { createInvoice, getInvoiceById, markInvoiceSent } from "@/lib/invoice-db";
import { sendInvoiceEmail } from "@/lib/mailer";
import {
    claimRecurringRun,
    completeRecurringRun,
    failRecurringRun,
    listDueRecurringInvoices,
    type RecurringFrequency,
    type RecurringInvoiceRecord,
} from "@/lib/recurring-invoice-db";

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function addMonthsClamped(date: Date, months: number, day: number) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + months;
    const first = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(Math.max(day, 1), lastDay)));
}

function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
    return new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
}

function weeklyDayIndex(day?: string | null) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const index = days.findIndex((value) => value.toLowerCase() === String(day || "").toLowerCase());
    return index >= 0 ? index : 1;
}

function nextWeeklyDate(date: Date, weekday: number, intervalWeeks = 1) {
    const base = addDays(date, 1);
    const delta = (weekday - base.getUTCDay() + 7) % 7;
    return addDays(base, delta + (intervalWeeks - 1) * 7);
}

function nextOccurrence(row: RecurringInvoiceRecord, scheduledFor: string) {
    const current = parseIsoDate(scheduledFor);
    const frequency = (row.frequency || row.cadence || "monthly") as RecurringFrequency;

    if (frequency === "daily") return toIsoDate(addDays(current, 1));
    if (frequency === "weekly") return toIsoDate(nextWeeklyDate(current, weeklyDayIndex(row.weekly_day)));
    if (frequency === "yearly") {
        const month = Math.min(Math.max(Number(row.yearly_month || current.getUTCMonth() + 1), 1), 12) - 1;
        const targetDay = Math.min(Math.max(Number(row.repeat_day || 1), 1), 31);
        let candidate = new Date(Date.UTC(current.getUTCFullYear() + 1, month, 1));
        const lastDay = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0)).getUTCDate();
        candidate.setUTCDate(Math.min(targetDay, lastDay));
        return toIsoDate(candidate);
    }
    if (frequency === "custom") {
        const every = Math.max(1, Number(row.custom_every || 1));
        const unit = String(row.custom_unit || "Month(s)").toLowerCase();
        if (unit.startsWith("day")) return toIsoDate(addDays(current, every));
        if (unit.startsWith("week")) return toIsoDate(nextWeeklyDate(current, weeklyDayIndex(row.weekly_day), every));
        if (unit.startsWith("year")) {
            const next = new Date(current);
            next.setUTCFullYear(next.getUTCFullYear() + every);
            return toIsoDate(next);
        }
        return toIsoDate(addMonthsClamped(current, every, Number(row.repeat_day || current.getUTCDate())));
    }

    return toIsoDate(addMonthsClamped(current, 1, Number(row.repeat_day || current.getUTCDate())));
}

function dueDateFor(invoiceDate: string) {
    return invoiceDate;
}

function baseUrl() {
    const configured = process.env.APP_BASE_URL?.trim();
    return (configured || "https://www.glitzofdiamonds.com").replace(/\/$/, "");
}

export async function runRecurringInvoiceScheduler(todayIso = new Date().toISOString().slice(0, 10)) {
    const dueRows = await listDueRecurringInvoices(todayIso);
    const results: Array<{ recurringInvoiceId: number; scheduledFor: string; status: string; invoiceId?: number; error?: string }> = [];

    for (const row of dueRows) {
        let scheduledFor = String(row.next_invoice_date).slice(0, 10);
        let safety = 0;

        while (scheduledFor <= todayIso && safety < 366) {
            safety += 1;
            const claimed = await claimRecurringRun(row.id, scheduledFor);
            if (!claimed) {
                scheduledFor = nextOccurrence(row, scheduledFor);
                continue;
            }

            try {
                const invoiceResult = await createInvoice({
                    memberId: row.member_id,
                    invoiceDate: scheduledFor,
                    dueDate: dueDateFor(scheduledFor),
                    notes: row.notes || "",
                    terms: "On Receipt",
                    items: [{ description: "Dues", quantity: 1, unitPriceCents: Number(row.amount_cents) }],
                });

                const invoice = await getInvoiceById(invoiceResult.id);
                if (!invoice) throw new Error("Generated invoice could not be loaded.");

                if (row.member_email) {
                    const invoiceUrl = `${baseUrl()}/invoice/${invoice.public_token}`;
                    await sendInvoiceEmail({
                        toEmail: row.member_email,
                        memberName: row.member_name || "Member",
                        invoiceNumber: invoice.invoice_number,
                        amountDueCents: Math.max(0, invoice.total_cents - invoice.amount_paid_cents),
                        dueDate: String(invoice.due_date),
                        invoiceUrl,
                    });
                    await markInvoiceSent(invoice.id);
                }

                const nextInvoiceDate = nextOccurrence(row, scheduledFor);
                await completeRecurringRun({
                    recurringInvoiceId: row.id,
                    scheduledFor,
                    invoiceId: invoice.id,
                    nextInvoiceDate,
                });

                results.push({ recurringInvoiceId: row.id, scheduledFor, status: "completed", invoiceId: invoice.id });
                scheduledFor = nextInvoiceDate;
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown recurring invoice error.";
                await failRecurringRun(row.id, scheduledFor, message);
                results.push({ recurringInvoiceId: row.id, scheduledFor, status: "failed", error: message });
                break;
            }
        }
    }

    return { checked: dueRows.length, results };
}
