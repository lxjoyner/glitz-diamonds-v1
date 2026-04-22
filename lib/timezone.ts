const CHICAGO_TIMEZONE = "America/Chicago";

function buildDateKey(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
        return "";
    }

    return `${year}-${month}-${day}`;
}

export function getChicagoDateKey(dateInput: string | number | Date = new Date()): string {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return buildDateKey(date, CHICAGO_TIMEZONE);
}

export { CHICAGO_TIMEZONE };
